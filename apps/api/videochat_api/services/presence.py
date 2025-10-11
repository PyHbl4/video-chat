from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Iterable

from redis.asyncio import Redis


PresenceStatus = str


@dataclass(slots=True)
class PresenceState:
    user_id: int
    status: PresenceStatus
    updated_at: datetime


class PresenceService:
    """Manage user presence information in Redis."""

    def __init__(self, redis: Redis, ttl_seconds: int = 120) -> None:
        self._redis = redis
        self._ttl = ttl_seconds

    @staticmethod
    def _key(user_id: int) -> str:
        return f"presence:user:{user_id}"

    async def set_status(self, user_id: int, status: PresenceStatus) -> PresenceState:
        updated_at = datetime.now(timezone.utc)
        payload = {"status": status, "updatedAt": updated_at.isoformat()}
        await self._redis.set(self._key(user_id), json.dumps(payload), ex=self._ttl)
        return PresenceState(user_id=user_id, status=status, updated_at=updated_at)

    async def set_online(self, user_id: int) -> PresenceState:
        return await self.set_status(user_id, "online")

    async def set_offline(self, user_id: int) -> PresenceState:
        return await self.set_status(user_id, "offline")

    async def get_status(self, user_id: int) -> PresenceState | None:
        raw = await self._redis.get(self._key(user_id))
        if not raw:
            return None
        data = json.loads(raw)
        updated_at_raw = data.get("updatedAt")
        updated_at = (
            datetime.fromisoformat(updated_at_raw)
            if isinstance(updated_at_raw, str)
            else datetime.now(timezone.utc)
        )
        status = data.get("status", "offline")
        return PresenceState(user_id=user_id, status=status, updated_at=updated_at)

    async def get_many_statuses(self, user_ids: Iterable[int]) -> dict[int, PresenceState]:
        ids = list(dict.fromkeys(user_ids))
        if not ids:
            return {}
        keys = [self._key(user_id) for user_id in ids]
        values = await self._redis.mget(keys)
        result: dict[int, PresenceState] = {}
        for user_id, raw in zip(ids, values):
            if not raw:
                continue
            data = json.loads(raw)
            updated_at_raw = data.get("updatedAt")
            updated_at = (
                datetime.fromisoformat(updated_at_raw)
                if isinstance(updated_at_raw, str)
                else datetime.now(timezone.utc)
            )
            status = data.get("status", "offline")
            result[user_id] = PresenceState(user_id=user_id, status=status, updated_at=updated_at)
        return result

    async def clear(self, user_id: int) -> None:
        await self._redis.delete(self._key(user_id))
