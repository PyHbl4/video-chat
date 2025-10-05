from __future__ import annotations

from dataclasses import dataclass

from redis.asyncio import Redis


def _key(namespace: str, identifier: str) -> str:
    return f"videochat:{namespace}:{identifier}"


@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: int


class RedisRateLimiter:
    def __init__(self, redis: Redis, namespace: str, limit: int, window_seconds: int) -> None:
        self.redis = redis
        self.namespace = namespace
        self.limit = limit
        self.window = window_seconds

    async def check(self, identifier: str) -> RateLimitResult:
        redis_key = _key(self.namespace, identifier)
        current = await self.redis.incr(redis_key)
        if current == 1:
            await self.redis.expire(redis_key, self.window)
        ttl = await self.redis.ttl(redis_key)
        remaining = max(self.limit - current, 0)
        allowed = current <= self.limit
        retry_after = max(ttl, 0) if not allowed else 0
        return RateLimitResult(allowed=allowed, remaining=remaining, retry_after=retry_after)

    async def reset(self, identifier: str) -> None:
        redis_key = _key(self.namespace, identifier)
        await self.redis.delete(redis_key)
