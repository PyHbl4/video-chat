from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from videochat_api.models import RoleName
from videochat_api.services.rbac import RoleUpdateMode


class AdminUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    is_blocked: bool
    roles: list[RoleName]
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUser]
    total: int
    page: int
    page_size: int


class BlockUserRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class RoleUpdateRequest(BaseModel):
    roles: list[RoleName] = Field(default_factory=list)
    mode: RoleUpdateMode = RoleUpdateMode.REPLACE


class ActiveRoomsResponse(BaseModel):
    rooms: list[dict[str, str]]
    total: int
    note: str | None = None


class ActiveCallsResponse(BaseModel):
    calls: list[dict[str, str]]
    total: int
    note: str | None = None


SortBy = Literal["created_at", "username"]
SortOrder = Literal["asc", "desc"]


__all__ = [
    "ActiveCallsResponse",
    "ActiveRoomsResponse",
    "AdminUser",
    "AdminUserListResponse",
    "BlockUserRequest",
    "RoleUpdateRequest",
    "SortBy",
    "SortOrder",
]
