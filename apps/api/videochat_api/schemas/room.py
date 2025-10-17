from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RoomStatus(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    ENDING = "ending"
    CLOSED = "closed"
    EXPIRED = "expired"


class RoomParticipantRole(str, Enum):
    INITIATOR = "initiator"
    GUEST = "guest"


class RoomParticipant(BaseModel):
    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)

    user_id: str = Field(alias="userId", serialization_alias="userId")
    role: RoomParticipantRole
    joined_at: datetime = Field(alias="joinedAt", serialization_alias="joinedAt")
    left_at: datetime | None = Field(default=None, alias="leftAt", serialization_alias="leftAt")


class Room(BaseModel):
    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)

    id: str
    status: RoomStatus
    initiator_id: str = Field(alias="initiatorId", serialization_alias="initiatorId")
    target_user_id: str | None = Field(
        default=None,
        alias="targetUserId",
        serialization_alias="targetUserId",
    )
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt", serialization_alias="updatedAt")
    closed_at: datetime | None = Field(default=None, alias="closedAt", serialization_alias="closedAt")
    participants: list[RoomParticipant] = Field(default_factory=list)


class RoomCreatePayload(BaseModel):
    target_user_id: str = Field(alias="targetUserId", serialization_alias="targetUserId")


class RoomCreateResponse(BaseModel):
    room: Room


class RoomStatusResponse(BaseModel):
    room: Room


class RoomSignalMessage(BaseModel):
    type: str
    data: Any = None


class RoomsListResponse(BaseModel):
    rooms: list[Room]
