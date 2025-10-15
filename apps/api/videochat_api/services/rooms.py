from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

from redis.asyncio import Redis
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videochat_api.models import Room, RoomParticipant, RoomParticipantRole, RoomStatus, User
from videochat_api.models.friend import FriendStatus as FriendModelStatus
from videochat_api.services.friendships import get_friend_user_ids


class RoomError(Exception):
    """Базовое исключение для доменных ошибок комнат."""


class RoomNotFoundError(RoomError):
    """Комната не найдена."""


class RoomForbiddenError(RoomError):
    """Пользователь не имеет доступа к комнате."""


class RoomConflictError(RoomError):
    """Состояние комнаты препятствует операции."""


@dataclass(slots=True)
class LeaveResult:
    room: Room
    remaining: int
    changed: bool


class RoomService:
    ACTIVE_STATUSES = {RoomStatus.WAITING, RoomStatus.ACTIVE, RoomStatus.ENDING}

    def __init__(self, db: AsyncSession, redis: Redis | None = None, ttl_seconds: int = 600) -> None:
        self._db = db
        self._redis = redis
        self._ttl_seconds = ttl_seconds

    async def create_room(self, initiator: User, target: User) -> Room:
        if initiator.id == target.id:
            raise RoomConflictError("Нельзя создать комнату с самим собой")

        friend_ids = await get_friend_user_ids(
            self._db, initiator.id, status=FriendModelStatus.ACCEPTED
        )
        if target.id not in friend_ids:
            raise RoomForbiddenError("Пользователи не являются друзьями")

        await self._ensure_user_is_free(initiator.id)
        await self._ensure_user_is_free(target.id)

        now = self._now()
        room = Room(initiator_id=initiator.id, status=RoomStatus.WAITING)
        participant = RoomParticipant(
            user_id=initiator.id,
            role=RoomParticipantRole.INITIATOR,
            joined_at=now,
        )
        room.participants.append(participant)

        self._db.add(room)
        await self._db.flush()
        await self._db.refresh(room, attribute_names=["participants"])

        await self._persist_cache(room)
        await self._db.commit()
        await self._reload(room)

        return room

    async def join_room(self, room_id: uuid.UUID, user: User) -> tuple[Room, bool]:
        room = await self._get_room(room_id)
        if room.status in {RoomStatus.CLOSED, RoomStatus.EXPIRED}:
            raise RoomConflictError("Комната недоступна")

        participant = self._find_participant(room, user.id)
        active_participants = [p for p in room.participants if p.left_at is None]

        if participant and participant.left_at is None:
            await self._touch_cache(room)
            return room, False

        if len(active_participants) >= 2 and (participant is None or participant.left_at is not None):
            raise RoomConflictError("Комната уже заполнена")

        if user.id != room.initiator_id:
            friend_ids = await get_friend_user_ids(
                self._db, room.initiator_id, status=FriendModelStatus.ACCEPTED
            )
            if user.id not in friend_ids:
                raise RoomForbiddenError("Нет доступа к комнате")

        now = self._now()
        if participant is None:
            participant = RoomParticipant(
                room_id=room.id,
                user_id=user.id,
                role=RoomParticipantRole.GUEST,
                joined_at=now,
                left_at=None,
            )
            room.participants.append(participant)
            self._db.add(participant)
        else:
            participant.joined_at = now
            participant.left_at = None

        if room.status in {RoomStatus.WAITING, RoomStatus.ENDING}:
            room.status = RoomStatus.ACTIVE
            room.closed_at = None

        await self._db.flush()
        await self._persist_cache(room)
        await self._db.commit()
        await self._reload(room)

        return room, True

    async def leave_room(self, room_id: uuid.UUID, user: User) -> LeaveResult:
        room = await self._get_room(room_id)
        participant = self._find_participant(room, user.id)
        if participant is None:
            raise RoomForbiddenError("Пользователь не состоит в комнате")

        if participant.left_at is not None:
            await self._touch_cache(room)
            return LeaveResult(room=room, remaining=self._count_active(room), changed=False)

        participant.left_at = self._now()

        await self._db.flush()

        remaining = self._count_active(room)
        if remaining == 0:
            room.status = RoomStatus.CLOSED
            room.closed_at = self._now()
            await self._evict_cache(room.id)
        elif remaining == 1:
            room.status = RoomStatus.ENDING
            await self._persist_cache(room)
        else:
            room.status = RoomStatus.ACTIVE
            await self._persist_cache(room)

        await self._db.flush()
        await self._db.commit()
        await self._reload(room)

        return LeaveResult(room=room, remaining=remaining, changed=True)

    async def get_room_for_user(self, room_id: uuid.UUID, user_id: int) -> Room:
        room = await self._get_room(room_id)
        if self._find_participant(room, user_id) is not None:
            return room

        if user_id == room.initiator_id:
            return room

        friend_ids = await get_friend_user_ids(
            self._db, room.initiator_id, status=FriendModelStatus.ACCEPTED
        )
        if user_id in friend_ids:
            return room

        raise RoomForbiddenError("Нет доступа к комнате")

    async def _ensure_user_is_free(self, user_id: int) -> None:
        stmt = (
            select(Room)
            .join(RoomParticipant)
            .options(selectinload(Room.participants))
            .where(RoomParticipant.user_id == user_id)
            .where(Room.status.in_(self.ACTIVE_STATUSES))
            .order_by(Room.created_at.desc())
            .limit(1)
        )
        result = await self._db.execute(stmt)
        existing = result.scalars().first()
        if existing:
            raise RoomConflictError("Пользователь уже состоит в активной комнате")

    async def _get_room(self, room_id: uuid.UUID) -> Room:
        stmt: Select[tuple[Room]] = (
            select(Room)
            .options(selectinload(Room.participants))
            .where(Room.id == room_id)
        )
        result = await self._db.execute(stmt)
        room = result.scalars().first()
        if room is None:
            raise RoomNotFoundError("Комната не найдена")
        return room

    @staticmethod
    def _find_participant(room: Room, user_id: int) -> RoomParticipant | None:
        for participant in room.participants:
            if participant.user_id == user_id:
                return participant
        return None

    @staticmethod
    def _count_active(room: Room) -> int:
        return sum(1 for participant in room.participants if participant.left_at is None)

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    async def _persist_cache(self, room: Room) -> None:
        if self._redis is None:
            return

        payload = {
            "id": str(room.id),
            "status": room.status.value,
            "initiatorId": str(room.initiator_id),
            "createdAt": room.created_at.isoformat() if room.created_at else None,
            "updatedAt": room.updated_at.isoformat() if room.updated_at else None,
            "closedAt": room.closed_at.isoformat() if room.closed_at else None,
        }
        await self._redis.set(self._room_key(room.id), json.dumps(payload), ex=self._ttl_seconds)

        active_ids = [str(p.user_id) for p in room.participants if p.left_at is None]
        participants_key = self._participants_key(room.id)
        await self._redis.delete(participants_key)
        if active_ids:
            await self._redis.sadd(participants_key, *active_ids)
            await self._redis.expire(participants_key, self._ttl_seconds)

    async def _touch_cache(self, room: Room) -> None:
        if self._redis is None:
            return
        await self._redis.expire(self._room_key(room.id), self._ttl_seconds)
        await self._redis.expire(self._participants_key(room.id), self._ttl_seconds)

    async def _evict_cache(self, room_id: uuid.UUID) -> None:
        if self._redis is None:
            return
        await self._redis.delete(self._room_key(room_id))
        await self._redis.delete(self._participants_key(room_id))

    async def _reload(self, room: Room) -> None:
        await self._db.refresh(room)
        await self._db.refresh(room, attribute_names=["participants"])

    @staticmethod
    def _room_key(room_id: uuid.UUID) -> str:
        return f"room:{room_id}"

    @staticmethod
    def _participants_key(room_id: uuid.UUID) -> str:
        return f"room:{room_id}:participants"
