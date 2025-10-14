from __future__ import annotations

import asyncio
import contextlib
import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass
from http.cookies import SimpleCookie
from typing import Any, Iterable

import socketio
from fastapi import FastAPI
from redis.asyncio import Redis

from videochat_api.auth.session import session_manager
from videochat_api.config import settings
from videochat_api.db.session import get_sessionmaker
from videochat_api.models import AuthSession, Room as RoomModel, User
from videochat_api.models.friend import FriendStatus as FriendModelStatus
from videochat_api.services.friendships import get_friend_user_ids
from videochat_api.services.presence import PresenceService, PresenceState
from videochat_api.services.rooms import (
    RoomConflictError,
    RoomForbiddenError,
    RoomNotFoundError,
    RoomService,
)

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

_fastapi_app: FastAPI | None = None
_active_user_sids: dict[int, set[str]] = defaultdict(set)
_sid_to_user: dict[str, int] = {}
_presence_refresh_tasks: dict[int, asyncio.Task[None]] = {}

_REFRESH_MARGIN_SECONDS = 5


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


def _get_redis_client(scope: dict[str, Any]) -> Redis | None:
    app = scope.get("app") if scope else None
    if app is None:
        app = _fastapi_app
    return getattr(app.state, "redis", None) if app is not None else None


def _schedule_presence_refresh(user_id: int, presence_service: PresenceService) -> None:
    if user_id in _presence_refresh_tasks:
        return

    async def _keepalive() -> None:
        interval = max(1, presence_service.ttl - _REFRESH_MARGIN_SECONDS)
        try:
            while True:
                await asyncio.sleep(interval)
                if not _active_user_sids.get(user_id):
                    break
                try:
                    refreshed = await presence_service.refresh_online(user_id)
                    if not refreshed and not _active_user_sids.get(user_id):
                        break
                except asyncio.CancelledError:  # pragma: no cover - cooperative cancellation
                    raise
                except Exception:  # pragma: no cover - defensive
                    logger.exception(
                        "Failed to refresh presence", extra={"user_id": user_id}
                    )
        except asyncio.CancelledError:  # pragma: no cover - cooperative cancellation
            raise
        finally:
            _presence_refresh_tasks.pop(user_id, None)

    _presence_refresh_tasks[user_id] = asyncio.create_task(_keepalive())


def _serialize_room(room: RoomModel) -> dict[str, Any]:
    return {
        "id": str(room.id),
        "status": room.status.value,
        "initiatorId": str(room.initiator_id),
        "createdAt": room.created_at.isoformat() if room.created_at else None,
        "updatedAt": room.updated_at.isoformat() if room.updated_at else None,
        "closedAt": room.closed_at.isoformat() if room.closed_at else None,
        "participants": [
            {
                "userId": str(participant.user_id),
                "role": participant.role.value,
                "joinedAt": participant.joined_at.isoformat(),
                "leftAt": participant.left_at.isoformat() if participant.left_at else None,
            }
            for participant in sorted(room.participants, key=lambda item: item.joined_at)
        ],
    }


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
        _schedule_presence_refresh(socket_user.id, presence_service)
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
        task = _presence_refresh_tasks.get(user_id)
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        if presence_service:
            update = await presence_service.set_offline(user_id)
            await _broadcast_presence(update, friend_ids)

    _sid_to_user.pop(sid, None)

    logger.info("Socket disconnected", extra={"sid": sid, "user_id": user_id})


class RoomNamespace(socketio.AsyncNamespace):
    def __init__(self, namespace: str = "/rooms") -> None:
        super().__init__(namespace)

    async def on_connect(self, sid: str, environ: dict[str, Any], auth: dict[str, Any] | None) -> None:
        scope: dict[str, Any] = environ.get("asgi.scope", {})
        if not auth or "roomId" not in auth:
            raise ConnectionRefusedError("Room ID is required")

        try:
            room_uuid = uuid.UUID(str(auth.get("roomId")))
        except ValueError:
            raise ConnectionRefusedError("Invalid room identifier")

        try:
            socket_user, _ = await _resolve_socket_user(auth, scope)
        except ConnectionRefusedError:
            logger.warning("Room namespace auth refused", extra={"sid": sid})
            raise

        redis = _get_redis_client(scope)
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as db:
            user = await db.get(User, socket_user.id)
            if user is None or user.is_blocked:
                raise ConnectionRefusedError("User not available")

            service = RoomService(db, redis)
            try:
                room, joined = await service.join_room(room_uuid, user)
            except RoomNotFoundError:
                raise ConnectionRefusedError("Room not found")
            except RoomForbiddenError:
                raise ConnectionRefusedError("Access denied")
            except RoomConflictError as exc:
                raise ConnectionRefusedError(str(exc))

            room_payload = _serialize_room(room)

        await self.save_session(sid, {"user_id": socket_user.id, "room_id": str(room_uuid)})
        await self.enter_room(sid, f"video-room:{room_uuid}")

        await self.emit("room:state", {"room": room_payload}, room=sid)

        if joined:
            await self.emit(
                "room:user_joined",
                {"room": room_payload, "userId": str(socket_user.id)},
                room=f"video-room:{room_uuid}",
                skip_sid=sid,
            )

        logger.info(
            "Room socket connected",
            extra={"sid": sid, "user_id": socket_user.id, "room_id": str(room_uuid)},
        )

    async def on_disconnect(self, sid: str) -> None:
        session = await self.get_session(sid)
        if not session:
            return

        room_id = session.get("room_id")
        user_id = session.get("user_id")

        await self.leave_room(sid, f"video-room:{room_id}")

        try:
            room_uuid = uuid.UUID(str(room_id)) if room_id else None
            user_id_int = int(user_id) if user_id is not None else None
        except (TypeError, ValueError):
            return

        if room_uuid is None or user_id_int is None:
            return

        redis = _get_redis_client({})
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as db:
            user = await db.get(User, user_id_int)
            if user is None:
                return

            service = RoomService(db, redis)
            try:
                result = await service.leave_room(room_uuid, user)
            except (RoomNotFoundError, RoomForbiddenError):
                return

            room_payload = _serialize_room(result.room)

        if result.changed:
            await self.emit(
                "room:user_left",
                {"room": room_payload, "userId": str(user_id_int)},
                room=f"video-room:{room_id}",
                skip_sid=sid,
            )

        logger.info(
            "Room socket disconnected",
            extra={"sid": sid, "user_id": user_id_int, "room_id": room_id},
        )

    async def on_signal(self, sid: str, data: dict[str, Any]) -> None:
        if not isinstance(data, dict):
            return

        session = await self.get_session(sid)
        if not session:
            return

        room_id = session.get("room_id")
        user_id = session.get("user_id")
        signal_type = data.get("type")
        if not room_id or user_id is None or not signal_type:
            return

        payload = {
            "type": signal_type,
            "data": data.get("data"),
            "fromUserId": str(user_id),
        }
        await self.emit("room:signal", payload, room=f"video-room:{room_id}", skip_sid=sid)

    async def on_message(self, sid: str, data: Any) -> None:  # noqa: D401 - socket.io event handler
        session = await self.get_session(sid)
        if not session:
            return

        room_id = session.get("room_id")
        user_id = session.get("user_id")
        if not room_id or user_id is None:
            return

        await self.emit(
            "room:message",
            {"message": data, "userId": str(user_id)},
            room=f"video-room:{room_id}",
            skip_sid=sid,
        )


sio.register_namespace(RoomNamespace("/rooms"))
