from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
