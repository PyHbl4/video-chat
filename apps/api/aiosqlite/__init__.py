from __future__ import annotations

import asyncio
import queue
import sqlite3
import threading
from asyncio import Future
from typing import Any, Callable, Iterable, Optional, Sequence

__all__ = [
    "connect",
    "Connection",
    "Cursor",
    "Error",
    "DatabaseError",
    "IntegrityError",
    "OperationalError",
    "ProgrammingError",
    "NotSupportedError",
    "Row",
    "sqlite_version",
    "sqlite_version_info",
]


Error = sqlite3.Error
DatabaseError = sqlite3.DatabaseError
IntegrityError = sqlite3.IntegrityError
OperationalError = sqlite3.OperationalError
ProgrammingError = sqlite3.ProgrammingError
NotSupportedError = sqlite3.NotSupportedError
Row = sqlite3.Row
sqlite_version = sqlite3.sqlite_version
sqlite_version_info = sqlite3.sqlite_version_info


Task = tuple[Future[Any], Optional[Callable[[], Any]]]


class Cursor:
    __slots__ = ("_connection", "_cursor", "arraysize", "description", "rowcount", "lastrowid")

    def __init__(self, connection: "Connection", cursor: sqlite3.Cursor) -> None:
        self._connection = connection
        self._cursor = cursor
        self.arraysize = 1
        self.description: Any | None = None
        self.rowcount: int = -1
        self.lastrowid: int | None = None

    async def execute(
        self, sql: str, parameters: Sequence[Any] | Iterable[Any] | None = None
    ) -> "Cursor":
        def _execute() -> None:
            if parameters is None:
                self._cursor.execute(sql)
            else:
                self._cursor.execute(sql, parameters)
            self.description = self._cursor.description
            self.rowcount = self._cursor.rowcount
            self.lastrowid = self._cursor.lastrowid

        await self._connection._run(_execute)
        return self

    async def executemany(self, sql: str, seq_of_parameters: Iterable[Sequence[Any]]) -> "Cursor":
        def _executemany() -> None:
            self._cursor.executemany(sql, seq_of_parameters)
            self.description = self._cursor.description
            self.rowcount = self._cursor.rowcount
            self.lastrowid = self._cursor.lastrowid

        await self._connection._run(_executemany)
        return self

    async def fetchone(self) -> Any | None:
        return await self._connection._run(self._cursor.fetchone)

    async def fetchmany(self, size: int | None = None) -> list[Any]:
        if size is None:
            size = self.arraysize
        return await self._connection._run(lambda: self._cursor.fetchmany(size))

    async def fetchall(self) -> list[Any]:
        return await self._connection._run(self._cursor.fetchall)

    async def close(self) -> None:
        await self._connection._run(self._cursor.close)


class Connection:
    def __init__(self, conn: sqlite3.Connection, loop: asyncio.AbstractEventLoop) -> None:
        self._conn = conn
        self._loop = loop
        self._tx: "queue.Queue[Task]" = queue.Queue()
        self._closed = False
        self._worker = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_started = False

    def _submit(self, fn: Optional[Callable[[], Any]]) -> Future[Any]:
        future: Future[Any] = self._loop.create_future()
        if not self._worker_started:
            self._worker.start()
            self._worker_started = True
        self._tx.put((future, fn))
        return future

    async def _run(self, fn: Callable[[], Any]) -> Any:
        future = self._submit(fn)
        return await future

    def _worker_loop(self) -> None:
        while True:
            future, fn = self._tx.get()
            if fn is None:
                try:
                    self._conn.close()
                except Exception as exc:  # pragma: no cover - best effort
                    self._loop.call_soon_threadsafe(future.set_exception, exc)
                else:
                    self._loop.call_soon_threadsafe(future.set_result, None)
                break
            try:
                result = fn()
            except Exception as exc:
                self._loop.call_soon_threadsafe(future.set_exception, exc)
            else:
                self._loop.call_soon_threadsafe(future.set_result, result)

    async def cursor(self) -> Cursor:
        cursor: sqlite3.Cursor = await self._run(self._conn.cursor)
        return Cursor(self, cursor)

    async def execute(
        self, sql: str, parameters: Sequence[Any] | Iterable[Any] | None = None
    ) -> Cursor:
        cursor = await self.cursor()
        await cursor.execute(sql, parameters)
        return cursor

    async def executemany(self, sql: str, seq_of_parameters: Iterable[Sequence[Any]]) -> Cursor:
        cursor = await self.cursor()
        await cursor.executemany(sql, seq_of_parameters)
        return cursor

    async def executescript(self, script: str) -> None:
        await self._run(lambda: self._conn.executescript(script))

    async def commit(self) -> None:
        await self._run(self._conn.commit)

    async def rollback(self) -> None:
        await self._run(self._conn.rollback)

    async def close(self) -> None:
        if self._closed:
            return
        if self._worker_started:
            future = self._submit(None)
            await future
        else:
            self._conn.close()
        self._closed = True

    async def __aenter__(self) -> "Connection":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        await self.close()

    def interrupt(self) -> None:
        self._conn.interrupt()

    @property
    def total_changes(self) -> int:
        return self._conn.total_changes

    @property
    def in_transaction(self) -> bool:
        return self._conn.in_transaction

    @property
    def row_factory(self) -> Any:
        return self._conn.row_factory

    @row_factory.setter
    def row_factory(self, factory: Any) -> None:
        self._conn.row_factory = factory

    @property
    def text_factory(self) -> Any:
        return self._conn.text_factory

    @text_factory.setter
    def text_factory(self, factory: Any) -> None:
        self._conn.text_factory = factory

    @property
    def isolation_level(self) -> str | None:
        return self._conn.isolation_level

    @isolation_level.setter
    def isolation_level(self, value: str | None) -> None:
        self._conn.isolation_level = value

    async def set_trace_callback(self, callback: Callable[[str], None] | None) -> None:
        await self._run(lambda: self._conn.set_trace_callback(callback))

    async def set_progress_handler(
        self, handler: Callable[[int], int] | None, n: int
    ) -> None:
        await self._run(lambda: self._conn.set_progress_handler(handler, n))

    async def create_function(
        self,
        name: str,
        num_params: int,
        func: Callable[..., Any],
        *,
        deterministic: bool = False,
    ) -> None:
        await self._run(
            lambda: self._conn.create_function(
                name, num_params, func, deterministic=deterministic
            )
        )

    async def create_aggregate(
        self, name: str, num_params: int, aggregate: type
    ) -> None:
        await self._run(lambda: self._conn.create_aggregate(name, num_params, aggregate))

    async def create_collation(self, name: str, callable_: Callable[[str, str], int]) -> None:
        await self._run(lambda: self._conn.create_collation(name, callable_))

    @property
    def daemon(self) -> bool:
        return self._worker.daemon

    @daemon.setter
    def daemon(self, value: bool) -> None:
        self._worker.daemon = value

    def __await__(self):  # type: ignore[override]
        async def _ready() -> "Connection":
            return self

        return _ready().__await__()


def connect(
    database: str,
    *,
    timeout: float = 5.0,
    detect_types: int = 0,
    isolation_level: str | None = None,
    check_same_thread: bool = False,
    uri: bool = False,
    loop: asyncio.AbstractEventLoop | None = None,
    **kwargs: Any,
) -> Connection:
    if loop is None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop()

    conn = sqlite3.connect(
        database,
        timeout=timeout,
        detect_types=detect_types,
        isolation_level=isolation_level,
        check_same_thread=check_same_thread,
        uri=uri,
        **kwargs,
    )
    conn.row_factory = kwargs.get("row_factory", conn.row_factory)
    return Connection(conn, loop)
