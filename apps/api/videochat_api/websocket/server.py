from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from http.cookies import SimpleCookie
from typing import Any, Iterable

import socketio
from fastapi import FastAPI

from videochat_api.auth.session import session_manager
from videochat_api.config import settings
from videochat_api.db.session import get_sessionmaker
from videochat_api.models import AuthSession, User
from videochat_api.models.friend import FriendStatus as FriendModelStatus
from videochat_api.services.friendships import get_friend_user_ids
from videochat_api.services.presence import PresenceService, PresenceState

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

_fastapi_app: FastAPI | None = None
_active_user_sids: dict[int, set[str]] = defaultdict(set)
_sid_to_user: dict[str, int] = {}


@dataclass(frozen=True, slots=True)
class SocketUser:
    id: int
    username: str


def bind_fastapi_app(app: FastAPI) -> None:
    global _fastapi_app
    _fastapi_app = app


def _extract_cookie(scope: dict[str, Any], name: str) -> str | None:
    headers: list[tuple[bytes, bytes]] = scope.get("headers", [])  # type: ignore[assignment]
    for header_name, value in headers:
        if header_name.decode("latin1").lower() == "cookie":
            cookie = SimpleCookie()
            cookie.load(value.decode("latin1"))
            morsel = cookie.get(name)
            if morsel:
                return morsel.value
    return None


async def _resolve_socket_user(auth: dict[str, Any] | None, scope: dict[str, Any]) -> tuple[SocketUser, set[int]]:
    if auth is None:
        raise ConnectionRefusedError("Authentication is required")

    sessionmaker = get_sessionmaker()
    async with sessionmaker() as db:
        session: AuthSession | None = None

        token = auth.get("token") if isinstance(auth, dict) else None
        csrf = auth.get("csrf") if isinstance(auth, dict) else None

        if token:
            payload = session_manager.decode_access_token(str(token))
            if not payload:
                raise ConnectionRefusedError("Invalid access token")
            session_id = payload.get("sid")
            if not session_id:
                raise ConnectionRefusedError("Malformed token payload")
            session = await db.get(AuthSession, str(session_id))
        elif csrf:
            raw_cookie = _extract_cookie(scope, settings.session_cookie_name)
            if not raw_cookie:
                raise ConnectionRefusedError("Missing session cookie")
            session = await session_manager.get_session_by_cookie(db, raw_cookie)
            if session is None or session.csrf_token != csrf:
                raise ConnectionRefusedError("Invalid CSRF token")
        else:
            raise ConnectionRefusedError("Unsupported authentication payload")

        if session is None or session.revoked_at is not None:
            raise ConnectionRefusedError("Session not found")

        user = await db.get(User, session.user_id)
        if user is None or user.is_blocked:
            raise ConnectionRefusedError("User is not available")

        session_manager.touch(session)
        await db.commit()

        friend_ids = await get_friend_user_ids(db, user.id, status=FriendModelStatus.ACCEPTED)

    return SocketUser(id=user.id, username=user.username), friend_ids


async def _broadcast_presence(update: PresenceState, recipient_ids: Iterable[int]) -> None:
    if not recipient_ids:
        return
    payload = {
        "userId": str(update.user_id),
        "status": update.status,
        "updatedAt": update.updated_at.isoformat(),
    }
    for user_id in set(recipient_ids):
        await sio.emit("presence:update", payload, room=f"user:{user_id}")


async def _send_snapshot(
    sid: str,
    presence_service: PresenceService,
    friend_ids: Iterable[int],
) -> None:
    statuses = await presence_service.get_many_statuses(friend_ids)
    for state in statuses.values():
        payload = {
            "userId": str(state.user_id),
            "status": state.status,
            "updatedAt": state.updated_at.isoformat(),
        }
        await sio.emit("presence:update", payload, to=sid)


def _get_presence_service(scope: dict[str, Any]) -> PresenceService | None:
    app = scope.get("app") if scope else None
    if app is None:
        app = _fastapi_app
    return getattr(app.state, "presence_service", None) if app is not None else None


@sio.event
async def connect(sid: str, environ: dict[str, Any], auth: dict[str, Any] | None) -> None:
    scope: dict[str, Any] = environ.get("asgi.scope", {})
    try:
        socket_user, friend_ids = await _resolve_socket_user(auth, scope)
    except ConnectionRefusedError:
        logger.warning("Socket authentication refused", extra={"sid": sid})
        raise
    except Exception:  # pragma: no cover - defensive
        logger.exception("Unexpected error during socket authentication", extra={"sid": sid})
        raise ConnectionRefusedError("Authentication failed")

    presence_service = _get_presence_service(scope)

    was_online = bool(_active_user_sids.get(socket_user.id))
    _active_user_sids[socket_user.id].add(sid)
    _sid_to_user[sid] = socket_user.id

    await sio.save_session(sid, {"user_id": socket_user.id, "friend_ids": list(friend_ids)})
    await sio.enter_room(sid, f"user:{socket_user.id}")

    if presence_service and not was_online:
        update = await presence_service.set_online(socket_user.id)
        await _broadcast_presence(update, friend_ids)

    if presence_service:
        await _send_snapshot(sid, presence_service, friend_ids)

    logger.info(
        "Socket connected",
        extra={"sid": sid, "user_id": socket_user.id, "friends": len(friend_ids)},
    )


@sio.event
async def disconnect(sid: str) -> None:
    session = await sio.get_session(sid)
    if not session:
        logger.debug("Socket disconnected without session", extra={"sid": sid})
        return

    user_id = session.get("user_id")
    friend_ids = session.get("friend_ids", [])
    await sio.leave_room(sid, f"user:{user_id}")

    scope = {}
    presence_service = _get_presence_service(scope)

    connections = _active_user_sids.get(user_id, set())
    connections.discard(sid)
    if not connections:
        _active_user_sids.pop(user_id, None)
        if presence_service:
            update = await presence_service.set_offline(user_id)
            await _broadcast_presence(update, friend_ids)

    _sid_to_user.pop(sid, None)

    logger.info("Socket disconnected", extra={"sid": sid, "user_id": user_id})
