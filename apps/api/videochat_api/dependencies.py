from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
import logging

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.auth.session import session_manager
from videochat_api.config import settings
from videochat_api.db.session import get_db_session
from videochat_api.models import AuthSession, User
from videochat_api.services.rate_limiter import NullRateLimiter, RateLimiter, RedisRateLimiter


logger = logging.getLogger(__name__)


async def get_redis(request: Request) -> Redis | None:
    redis: Redis | None = getattr(request.app.state, "redis", None)
    return redis


async def get_rate_limiter(redis: Redis | None = Depends(get_redis)) -> RateLimiter:
    limit = settings.login_rate_limit_attempts
    window = settings.login_rate_limit_window_seconds
    if redis is None:
        logger.warning("Redis недоступен, rate limiter переходит в разрешающий режим")
        return NullRateLimiter(limit=limit)
    return RedisRateLimiter(
        redis=redis,
        namespace="login",
        limit=limit,
        window_seconds=window,
    )


async def get_session_dependency() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def _resolve_session_from_authorization(
    db: AsyncSession,
    authorization: str,
) -> AuthSession | None:
    if not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None

    payload = session_manager.decode_access_token(token)
    if not payload:
        return None

    session_id = payload.get("sid")
    subject = payload.get("sub")
    if not session_id or not subject:
        return None

    session = await db.get(AuthSession, str(session_id))
    if not session or session.revoked_at:
        return None

    if session.expires_at and session.expires_at < datetime.now(timezone.utc):
        return None

    if str(session.user_id) != str(subject):
        return None

    return session


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_session_dependency),
) -> User:
    session: AuthSession | None = None

    auth_header = request.headers.get("Authorization")
    if auth_header:
        session = await _resolve_session_from_authorization(db, auth_header)

    if session is None:
        cookie_name = settings.session_cookie_name
        raw_cookie = request.cookies.get(cookie_name)
        if not raw_cookie:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        session = await session_manager.get_session_by_cookie(db, raw_cookie)
        if session is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = await db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.is_blocked:
        await session_manager.revoke_user_sessions(db, user.id)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")

    session_manager.touch(session)
    request.state.auth_session = session
    request.state.db_session = db

    return user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Требуются права администратора")
    return current_user
