from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.auth.session import session_manager
from videochat_api.config import settings
from videochat_api.db.session import get_db_session
from videochat_api.models import User
from videochat_api.services.rate_limiter import RedisRateLimiter


async def get_redis(request: Request) -> Redis:
    redis: Redis = request.app.state.redis
    return redis


async def get_rate_limiter(redis: Redis = Depends(get_redis)) -> RedisRateLimiter:
    return RedisRateLimiter(
        redis=redis,
        namespace="login",
        limit=settings.login_rate_limit_attempts,
        window_seconds=settings.login_rate_limit_window_seconds,
    )


async def get_session_dependency() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_session_dependency),
) -> User:
    cookie_name = settings.session_cookie_name
    raw_session = request.cookies.get(cookie_name)
    if not raw_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    data = session_manager.load(raw_session)
    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user_id = data.get("user_id")
    if not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")

    request.state.session_data = data
    return user
