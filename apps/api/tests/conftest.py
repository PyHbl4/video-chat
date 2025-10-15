from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from typing import AsyncGenerator, Awaitable, Callable

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

pytest_plugins = ("pytest_asyncio_plugin",)
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from videochat_api.api.endpoints import auth as auth_endpoints
from videochat_api.api.endpoints import friends as friends_endpoints
from videochat_api.api.endpoints import rooms as rooms_endpoints
from videochat_api.api.endpoints import users as users_endpoints
from videochat_api.auth.passwords import hash_password
from videochat_api.config import settings
from videochat_api.db.base import Base
from videochat_api.dependencies import get_rate_limiter, get_session_dependency
from videochat_api.models import User
from videochat_api.services import PresenceService
from videochat_api.websocket.server import bind_fastapi_app


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


class _FakeRedis:
    def __init__(self) -> None:
        self._store: dict[str, object] = {}

    async def set(self, key: str, value: str, ex: int | None = None) -> None:  # noqa: ARG002
        self._store[key] = value

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self._store.get(key) for key in keys]

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def expire(self, key: str, ttl: int) -> None:  # noqa: ARG002
        return None

    async def sadd(self, key: str, *values: str) -> None:
        current = self._store.get(key)
        if not isinstance(current, set):
            current = set()
        current.update(values)
        self._store[key] = current

    async def smembers(self, key: str) -> set[str]:
        members = self._store.get(key)
        if isinstance(members, set):
            return set(members)
        return set()

    async def aclose(self) -> None:
        self._store.clear()


@pytest.fixture
async def app(sessionmaker: async_sessionmaker[AsyncSession]) -> FastAPI:
    app = FastAPI()
    app.include_router(auth_endpoints.router)
    app.include_router(users_endpoints.router)
    app.include_router(friends_endpoints.router)
    app.include_router(rooms_endpoints.router)

    async def override_session_dependency() -> AsyncGenerator[AsyncSession, None]:
        async with sessionmaker() as session:
            yield session

    app.dependency_overrides[get_session_dependency] = override_session_dependency
    app.dependency_overrides[get_rate_limiter] = lambda: _AllowAllLimiter()

    fake_redis = _FakeRedis()
    app.state.redis = fake_redis
    app.state.presence_service = PresenceService(fake_redis)
    bind_fastapi_app(app)
    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://testserver") as test_client:
        yield test_client


@pytest.fixture
def user_factory(
    sessionmaker: async_sessionmaker[AsyncSession],
) -> Callable[[str, str, str, bool, bool], Awaitable[User]]:
    async def _create_user(
        username: str,
        email: str,
        password: str,
        is_blocked: bool = False,
        is_admin: bool = False,
    ) -> User:
        async with sessionmaker() as session:
            now = datetime.now(timezone.utc)
            user = User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                is_blocked=is_blocked,
                is_admin=is_admin,
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
