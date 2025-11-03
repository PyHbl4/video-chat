from __future__ import annotations

from datetime import datetime

from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from videochat_api.models.user import UserRole


class UserSearchItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    username: str
    display_name: str = Field(alias="displayName", serialization_alias="displayName")
    avatar_url: str | None = Field(default=None, alias="avatarUrl", serialization_alias="avatarUrl")
    bio: str | None = None
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")


class UserSearchResponse(BaseModel):
    items: list[UserSearchItem]


class UserDevice(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    identifier: str
    kind: str
    display_name: str | None = Field(default=None, alias="displayName", serialization_alias="displayName")
    user_agent: str | None = Field(default=None, alias="userAgent", serialization_alias="userAgent")
    last_seen_at: datetime | None = Field(default=None, alias="lastSeenAt", serialization_alias="lastSeenAt")
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt", serialization_alias="updatedAt")
    revoked_at: datetime | None = Field(default=None, alias="revokedAt", serialization_alias="revokedAt")


class UserSession(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    kind: str
    device_id: str | None = Field(default=None, alias="deviceId", serialization_alias="deviceId")
    expires_at: datetime | None = Field(default=None, alias="expiresAt", serialization_alias="expiresAt")
    last_seen_at: datetime | None = Field(default=None, alias="lastSeenAt", serialization_alias="lastSeenAt")
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")
    revoked_at: datetime | None = Field(default=None, alias="revokedAt", serialization_alias="revokedAt")
    ip_address: str | None = Field(default=None, alias="ipAddress", serialization_alias="ipAddress")
    user_agent: str | None = Field(default=None, alias="userAgent", serialization_alias="userAgent")


class UserListItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    username: str
    email: EmailStr
    is_blocked: bool = Field(alias="isBlocked", serialization_alias="isBlocked")
    role: UserRole = Field(alias="role", serialization_alias="role")
    created_at: datetime = Field(alias="createdAt", serialization_alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt", serialization_alias="updatedAt")
    devices: list[UserDevice] | None = None
    sessions: list[UserSession] | None = None

    @model_validator(mode="before")
    @classmethod
    def _migrate_is_admin(cls, values: Any) -> Any:
        if isinstance(values, dict) and "role" not in values:
            is_admin_value = values.get("is_admin", values.get("isAdmin"))
            if isinstance(is_admin_value, bool):
                values["role"] = UserRole.ADMIN if is_admin_value else UserRole.USER
        return values


class UserListResponse(BaseModel):
    users: list[UserListItem]
