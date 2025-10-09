from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.auth.passwords import hash_password, verify_password
from videochat_api.auth.session import DeviceInfo, session_manager
from videochat_api.config import settings
from videochat_api.dependencies import (
    get_current_user,
    get_rate_limiter,
    get_session_dependency,
)
from videochat_api.models import Device, DeviceKind, SessionKind, User
from videochat_api.schemas import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    UserResponse,
)
from videochat_api.services.rate_limiter import RedisRateLimiter
from videochat_api.services.rbac import RoleName, role_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_session_dependency),
) -> UserResponse:
    """
    Регистрирует нового пользователя в системе.
    Этот эндпоинт обрабатывает регистрацию пользователя, валидируя входные данные, проверяя на дубликаты,
    хэшируя пароль и сохраняя пользователя в базе данных.
    Параметры:
    - payload (RegisterRequest): Данные регистрации, включая username, email и password.
    - db (AsyncSession): Сессия базы данных для выполнения запросов и коммитов.
    Возвращает:
    - UserResponse: Детали созданного пользователя.
    Выбрасывает:
    - HTTPException(400): Если username пустой, пользователь уже существует или возникает ошибка целостности.
    """
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be blank")

    email = str(payload.email).lower()
    existing_query = select(User).where((User.username == username) | (User.email == email))
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(payload.password),
        is_blocked=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(user)
    try:
        await db.flush()
        await role_service.ensure_role(db, user.id, RoleName.USER)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=LoginResponse)
async def login_user(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_session_dependency),
    rate_limiter: RedisRateLimiter = Depends(get_rate_limiter),
) -> LoginResponse:
    """
    Аутентифицирует пользователя и создает сессию.
    Этот эндпоинт обрабатывает вход пользователя, проверяя учетные данные, ограничивая попытки,
    и создавая либо веб-сессию (с куки), либо сессию устройства (с токенами).
    Параметры:
    - request (Request): Объект запроса FastAPI для доступа к информации клиента.
    - response (Response): Объект ответа FastAPI для установки куки.
    - payload (LoginRequest): Данные входа, включая identifier (username/email), password и опциональную информацию об устройстве.
    - db (AsyncSession): Сессия базы данных.
    - rate_limiter (RedisRateLimiter): Ограничитель для предотвращения brute-force.
    Возвращает:
    - LoginResponse: Токены или детали сессии в зависимости от типа устройства.
    Выбрасывает:
    - HTTPException(429): Слишком много попыток входа.
    - HTTPException(401): Недействительные учетные данные.
    - HTTPException(403): Пользователь заблокирован.
    """
    client_host = request.client.host if request.client else "unknown"
    rate_limit = await rate_limiter.check(client_host)
    if not rate_limit.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(rate_limit.retry_after)},
        )

    identifier = payload.identifier.strip()
    if "@" in identifier:
        query = select(User).where(User.email == identifier.lower())
    else:
        query = select(User).where(User.username == identifier)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")

    await rate_limiter.reset(client_host)

    device_payload = payload.device
    device_kind = DeviceKind(device_payload.kind) if device_payload else DeviceKind.WEB
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        if device_kind == DeviceKind.WEB:
            web_tokens = await session_manager.create_web_session(db, user, ip_address, user_agent)
            await db.commit()
            response.set_cookie(
                key=settings.session_cookie_name,
                value=web_tokens.session_cookie,
                max_age=settings.session_max_age_seconds,
                httponly=True,
                secure=settings.session_cookie_secure,
                samesite=settings.session_samesite,
                path="/",
            )
            return LoginResponse(
                csrf_token=web_tokens.csrf_token,
                session_expires_in=settings.session_max_age_seconds,
            )

        device_info = DeviceInfo(
            kind=device_kind,
            identifier=device_payload.identifier if device_payload else None,
            display_name=device_payload.display_name if device_payload else None,
        )
        device_tokens = await session_manager.create_device_session(
            db,
            user,
            device_info,
            ip_address,
            user_agent,
        )
        await db.commit()
        return LoginResponse(
            access_token=device_tokens.access_token,
            refresh_token=device_tokens.refresh_token,
            expires_in=settings.access_token_ttl_seconds,
            refresh_expires_in=settings.refresh_token_ttl_seconds,
            device_id=device_tokens.device_identifier,
            token_type="bearer",
        )
    except Exception:
        await db.rollback()
        raise


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_session(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_session_dependency),
) -> RefreshResponse:
    """
    Обновляет access-токен с помощью refresh-токена.
    Этот эндпоинт валидирует refresh-токен, проверяет статус пользователя и устройства,
    и выдает новые токены, поворачивая refresh-токен.
    Параметры:
    - payload (RefreshRequest): Содержит refresh_token и опциональный device_id.
    - db (AsyncSession): Сессия базы данных.
    Возвращает:
    - RefreshResponse: Новые access- и refresh-токены.
    Выбрасывает:
    - HTTPException(401): Недействительный refresh-токен, устройство или пользователь не найден.
    - HTTPException(403): Пользователь заблокирован.
    """
    session = await session_manager.get_session_by_refresh(db, payload.refresh_token)
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    device_identifier = payload.device_id or ""
    if session.device_id is not None:
        device = await db.get(Device, session.device_id)
        if not device:
            await session_manager.revoke_session(db, session)
            await db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device")
        if payload.device_id and device.identifier != payload.device_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mismatched device")
        device_identifier = device.identifier

    user = await db.get(User, session.user_id)
    if not user:
        await session_manager.revoke_session(db, session)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.is_blocked:
        await session_manager.revoke_user_sessions(db, user.id)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")

    tokens = await session_manager.rotate_refresh_token(db, session)
    await db.commit()

    return RefreshResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=settings.access_token_ttl_seconds,
        refresh_expires_in=settings.refresh_token_ttl_seconds,
        device_id=tokens.device_identifier or device_identifier,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout_user(
    request: Request,
    response: Response,
    _payload: LogoutRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session_dependency),
) -> Response:
    """
    Выходит текущего пользователя, отзывая сессию.
    Этот эндпоинт обрабатывает выход, валидируя CSRF для веб-сессий или refresh_token для устройств,
    удаляет куки, если применимо, и отзывает сессию в базе данных.
    Параметры:
    - request (Request): Для доступа к сессии и заголовкам.
    - response (Response): Для удаления куки.
    - _payload (LogoutRequest | None): Опциональный payload с refresh_token для сессий устройств.
    - current_user (User): Аутентифицированный пользователь.
    - db (AsyncSession): Сессия базы данных.
    Возвращает:
    - Response: Пустой ответ со статусом 204.
    Выбрасывает:
    - HTTPException(401): Сессия не найдена.
    - HTTPException(403): Недействительный refresh-токен или CSRF-токен.
    """
    session = getattr(request.state, "auth_session", None)
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found")

    if _payload and _payload.refresh_token and session.kind in {SessionKind.DESKTOP, SessionKind.TAURI}:
        matched = await session_manager.get_session_by_refresh(db, _payload.refresh_token)
        if not matched or matched.id != session.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid refresh token")

    if session.kind == SessionKind.WEB:
        header_name = settings.csrf_header
        csrf_token = request.headers.get(header_name)
        if not csrf_token or session.csrf_token != csrf_token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")

        response.delete_cookie(
            key=settings.session_cookie_name,
            httponly=True,
            secure=settings.session_cookie_secure,
            samesite=settings.session_samesite,
            path="/",
        )

    await session_manager.revoke_session(db, session)
    await db.commit()

    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Получает детали текущего аутентифицированного пользователя.
    Этот эндпоинт возвращает информацию о пользователе для аутентифицированной сессии.
    Параметры:
    - current_user (User): Инжектированный текущий пользователь из зависимости аутентификации.
    Возвращает:
    - UserResponse: Валидированные детали пользователя.
    """
    return UserResponse.model_validate(current_user)
