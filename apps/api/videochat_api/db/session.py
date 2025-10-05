from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from videochat_api.config import settings

_engine: AsyncEngine | None = None
_SessionMaker: async_sessionmaker[AsyncSession] | None = None


def _make_async_database_url() -> str:
    return settings.database_url_async


def get_engine() -> AsyncEngine:
    global _engine, _SessionMaker
    if _engine is None:
        database_url = _make_async_database_url()
        _engine = create_async_engine(database_url, pool_pre_ping=True)
        _SessionMaker = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _SessionMaker
    if _SessionMaker is None:
        get_engine()
    assert _SessionMaker is not None
    return _SessionMaker


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        yield session
