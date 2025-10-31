from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import AsyncGenerator, Awaitable, Callable

import pytest

from httpx import AsyncClient


@pytest.fixture(scope="module", params=["asyncio"])
def anyio_backend(request: pytest.FixtureRequest) -> str:
    """
    @pytest.fixture: Это декоратор, который определяет фикстуру в pytest.
    Параметры декоратора:
        scope="module": Фикстура создаётся один раз для всего модуля (файла тестов), а не для каждого теста.
            Это экономит время и ресурсы.
        params=["asyncio"]: Список параметров для параметризации.

    Параметры фикстуры:
        request: Специальный объект от pytest, который содержит информацию о текущем тесте,
            включая выбранный параметр из params.

    Тесты, использующие эту фикстуру, запустятся для каждого значения в списке.
    Здесь только один — "asyncio", так что тесты запустятся один раз.
    """
    return request.param

pytest_plugins = ("pytest_asyncio_plugin",)
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from fastapi import FastAPI

from videochat_api.asgi import ASGIApplication, create_socketio_fastapi_app
from videochat_api.auth.passwords import hash_password
from videochat_api.config import settings
from videochat_api.db.base import Base
from videochat_api.dependencies import get_rate_limiter, get_session_dependency
from videochat_api.main import create_fastapi_app
from videochat_api.models import User
from videochat_api.services import PresenceService
from videochat_api.websocket.server import sio


# Создаёт фабрику с асинхронным SQLAlchemy engine на SQLite в памяти (база не сохраняется на диск, только в RAM).
@pytest.fixture
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    import videochat_api.models  # ensure models are registered  # noqa: F401

    # Создаёт двигатель с опциями — без проверки (для SQLite).
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Создаёт таблицы в базе данных.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine                # Отдаёт engine тестам.
    finally:
        await engine.dispose()      # Закрывает engine после тестов.


# Создаёт фабрику с асинхронной сессией с помощью engine.
@pytest.fixture
async def sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


# Класс для мокинга (фейковых объектов)
class _AllowAllLimiter:
    async def check(self, key: str) -> SimpleNamespace:
        return SimpleNamespace(allowed=True, retry_after=0)

    async def reset(self, key: str) -> None:
        return None


# Мокинг Redis (использует простой dict в памяти).
class _FakeRedis:
    # Конструктор класса - создаёт пустой словарь (dict).
    def __init__(self) -> None:
        self._store: dict[str, object] = {}

    # Метод set (установка значения). Имитирует Redis-команду SET — сохранить значение по ключу.
    async def set(self, key: str, value: str, ex: int | None = None) -> None:  # noqa: ARG002
        self._store[key] = value

    # Метод get (получение значения). Имитирует Redis-команду GET — получить значение по ключу.
    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    # Метод mget (получение нескольких значений). Имитирует Redis-команду MGET — получить несколько значений по ключам.
    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self._store.get(key) for key in keys]

    # Метод delete (удаление значения).
    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    # Метод expire (установка времени жизни ключа).
    async def expire(self, key: str, ttl: int) -> None:  # noqa: ARG002
        return None

    # Метод sadd (добавление в set). Имитирует Redis-команду SADD — добавить значения в множество.
    async def sadd(self, key: str, *values: str) -> None:
        current = self._store.get(key)
        if not isinstance(current, set):
            current = set()
        current.update(values)
        self._store[key] = current

    # Метод smembers (получение всех значений из set). Имитирует Redis-команду SMEMBERS — получить все значения из множества.
    async def smembers(self, key: str) -> set[str]:
        members = self._store.get(key)
        if isinstance(members, set):
            return set(members)
        return set()

    # Очищает хранилище.
    async def aclose(self) -> None:
        self._store.clear()


# Создаёт тестовое ASGI-приложение (FastAPI + SocketIO).
@pytest.fixture
async def app(sessionmaker: async_sessionmaker[AsyncSession]) -> ASGIApplication:
    # Вызывает функцию create_fastapi_app() из модуля videochat_api.main.
    fastapi_app = create_fastapi_app()

    # Переопределение (мокинг) зависимости для сессий БД.
    async def override_session_dependency() -> AsyncGenerator[AsyncSession, None]:
        """
        Определяет асинхронную функцию-генератор.
        Создаёт сессию БД с помощью sessionmaker (из предыдущей фикстуры),
        использует async with для автоматического закрытия сессии после использования,
        и yield session — отдаёт сессию вызывающему коду.
        """
        async with sessionmaker() as session:
            yield session

    # Переопределяет зависимость get_session_dependency в fastapi_app (с реальной на тестовую).
    fastapi_app.dependency_overrides[get_session_dependency] = (
        override_session_dependency
    )

    # Переопределяет зависимость get_rate_limiter в fastapi_app (с реальной на на тестовый "безлимитовый" класс).
    fastapi_app.dependency_overrides[get_rate_limiter] = lambda: _AllowAllLimiter()

    # Создаёт класс-мок, имитирующий Redis
    fake_redis = _FakeRedis()
    presence_service = PresenceService(fake_redis)
    fastapi_app.state.redis = fake_redis
    fastapi_app.state.presence_service = presence_service

    # Переопределяет lifespan_context (жизненный цикл приложения) в fastapi_app (с реальной на тестовую).
    @asynccontextmanager
    async def _lifespan_override(app: FastAPI) -> AsyncGenerator[None, None]:
        # Мокинг Redis и presence_service в app.state (на случай, если они не были установлены раньше).
        app.state.redis = fake_redis
        app.state.presence_service = presence_service
        try:
            yield
        finally:
            await fake_redis.aclose()   # Закрывает Redis после завершения тестов, очищает dict.

    # Устанавливает lifespan_context в fastapi_app (с реального на тестовый).
    fastapi_app.router.lifespan_context = _lifespan_override

    # Создает ASGI-приложение, передавая модифицированное fastapi_app + SocketIO.
    return create_socketio_fastapi_app(fastapi_app, sio)


# Создаёт асинхронный HTTP-клиент для тестирования app
@pytest.fixture
async def client(app: ASGIApplication) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://testserver") as test_client:
        yield test_client


# Фабрика для создания тестовых пользователей.
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


# Возвращает имя заголовка для CSRF-защиты из настроек.
@pytest.fixture
def csrf_header() -> str:
    return settings.csrf_header


# Возвращает имя куки для сессий из настроек.
@pytest.fixture
def session_cookie_name() -> str:
    return settings.session_cookie_name
