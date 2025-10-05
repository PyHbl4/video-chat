from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.auth.passwords import hash_password, verify_password
from videochat_api.auth.session import session_manager
from videochat_api.config import settings
from videochat_api.dependencies import (
    get_current_user,
    get_rate_limiter,
    get_session_dependency,
)
from videochat_api.models import User
from videochat_api.schemas import AuthSession, LoginRequest, RegisterRequest, UserResponse
from videochat_api.services.rate_limiter import RedisRateLimiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_session_dependency),
) -> UserResponse:
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
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=AuthSession)
async def login_user(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_session_dependency),
    rate_limiter: RedisRateLimiter = Depends(get_rate_limiter),
) -> AuthSession:
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

    cookie_value, csrf_token = session_manager.create(user.id)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=cookie_value,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_samesite,
        path="/",
    )

    return AuthSession(csrf_token=csrf_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout_user(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
) -> Response:
    header_name = settings.csrf_header
    csrf_token = request.headers.get(header_name)
    if not csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CSRF token")

    raw_session = request.cookies.get(settings.session_cookie_name)
    if not raw_session or not session_manager.validate_csrf(raw_session, csrf_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")

    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_samesite,
        path="/",
    )

    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
