from __future__ import annotations

import logging
from typing import Any

import socketio

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid: str, environ: dict[str, Any], auth: dict[str, Any] | None) -> None:
    logger.debug("Socket connected", extra={"sid": sid, "auth": auth})


@sio.event
async def disconnect(sid: str) -> None:
    logger.debug("Socket disconnected", extra={"sid": sid})
