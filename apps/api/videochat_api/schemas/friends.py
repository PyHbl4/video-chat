from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class FriendStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    BLOCKED = "blocked"


class FriendUser(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    username: str
    display_name: str = Field(alias="displayName", serialization_alias="displayName")
    avatar_url: str | None = Field(default=None, alias="avatarUrl", serialization_alias="avatarUrl")
    bio: str | None = None
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")


class Friend(BaseModel):
    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)

    id: str
    requester_id: str = Field(alias="requesterId", serialization_alias="requesterId")
    addressee_id: str = Field(alias="addresseeId", serialization_alias="addresseeId")
    status: FriendStatus
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")
    responded_at: datetime | None = Field(
        default=None, alias="respondedAt", serialization_alias="respondedAt"
    )
    requester: FriendUser | None = None
    addressee: FriendUser | None = None


class FriendRequestPayload(BaseModel):
    target_user_id: str = Field(alias="targetUserId", serialization_alias="targetUserId")


class FriendDecisionPayload(BaseModel):
    request_id: str = Field(alias="requestId", serialization_alias="requestId")
