from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from typing import AsyncGenerator, Awaitable, Callable

import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from videochat_api.api.endpoints import auth as auth_endpoints
from videochat_api.auth.passwords import hash_password
from videochat_api.config import settings
from videochat_api.db.base import Base
from videochat_api.dependencies import get_rate_limiter, get_session_dependency
from videochat_api.models import User


@pytest.fixture
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    import videochat_api.models  # ensure models are registered  # noqa: F401

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.fixture
async def sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


class _AllowAllLimiter:
    async def check(self, key: str) -> SimpleNamespace:
        return SimpleNamespace(allowed=True, retry_after=0)

    async def reset(self, key: str) -> None:
        return None


@pytest.fixture
async def app(sessionmaker: async_sessionmaker[AsyncSession]) -> FastAPI:
    app = FastAPI()
    app.include_router(auth_endpoints.router)

    async def override_session_dependency() -> AsyncGenerator[AsyncSession, None]:
        async with sessionmaker() as session:
            yield session

    app.dependency_overrides[get_session_dependency] = override_session_dependency
    app.dependency_overrides[get_rate_limiter] = lambda: _AllowAllLimiter()
    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://testserver") as test_client:
        yield test_client


@pytest.fixture
def user_factory(sessionmaker: async_sessionmaker[AsyncSession]) -> Callable[[str, str, str, bool], Awaitable[User]]:
    async def _create_user(
        username: str,
        email: str,
        password: str,
        is_blocked: bool = False,
    ) -> User:
        async with sessionmaker() as session:
            now = datetime.now(timezone.utc)
            user = User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                is_blocked=is_blocked,
                created_at=now,
                updated_at=now,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    return _create_user


@pytest.fixture
def csrf_header() -> str:
    return settings.csrf_header


@pytest.fixture
def session_cookie_name() -> str:
    return settings.session_cookie_name
