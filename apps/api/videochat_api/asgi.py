from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import FastAPI
from socketio import ASGIApp as SocketIOASGIApp
from starlette.types import Receive, Scope, Send


class SocketIOFastAPIApp:
    """ASGI-приложение, объединяющее FastAPI и Socket.IO."""

    def __init__(
        self,
        fastapi_app: FastAPI,
        socketio_app: Callable[[Scope, Receive, Send], Awaitable[None]],
        *,
        socketio_path: str = "/socket.io",
    ) -> None:
        self.fastapi_app = fastapi_app
        self._socketio_path = self._normalize_path(socketio_path)
        self._socketio_app = SocketIOASGIApp(
            socketio_app, socketio_path=self._socketio_path.lstrip("/")
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        scope_type = scope.get("type")

        if scope_type == "lifespan":
            await self.fastapi_app(scope, receive, send)
            return

        if scope_type in {"http", "websocket"} and self._is_socketio_scope(scope):
            await self._socketio_app(scope, receive, send)
            return

        original_app = scope.get("app")
        scope["app"] = self.fastapi_app
        try:
            await self.fastapi_app(scope, receive, send)
        finally:
            if original_app is None:
                scope.pop("app", None)
            else:
                scope["app"] = original_app

    def _is_socketio_scope(self, scope: Scope) -> bool:
        path = scope.get("path") or ""
        normalized = path.rstrip("/")
        return normalized == self._socketio_path or normalized.startswith(
            f"{self._socketio_path}/"
        )

    @property
    def state(self):  # type: ignore[override]
        return self.fastapi_app.state

    @staticmethod
    def _normalize_path(path: str) -> str:
        if not path:
            return "/socket.io"
        if not path.startswith("/"):
            path = f"/{path}"
        return path.rstrip("/") or "/socket.io"


ASGIApplication = Callable[[Scope, Receive, Send], Awaitable[None]]


def create_socketio_fastapi_app(
    fastapi_app: FastAPI,
    socketio_app: Callable[[Scope, Receive, Send], Awaitable[None]],
    *,
    socketio_path: str = "/socket.io",
) -> SocketIOFastAPIApp:
    """Фабрика адаптера для единообразного импорта."""

    return SocketIOFastAPIApp(
        fastapi_app=fastapi_app,
        socketio_app=socketio_app,
        socketio_path=socketio_path,
    )
