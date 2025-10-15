from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class DeviceRequest(BaseModel):
    identifier: str | None = Field(default=None, max_length=128)
    kind: Literal["web", "desktop", "tauri"] = "web"
    display_name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    identifier: str = Field(description="Username or email", min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    device: DeviceRequest | None = None


class LoginResponse(BaseModel):
    csrf_token: str | None = None
    session_expires_in: int | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None
    refresh_expires_in: int | None = None
    device_id: str | None = None
    token_type: Literal["bearer"] | None = None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=16, max_length=512)
    device_id: str | None = Field(default=None, max_length=128)


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int
    device_id: str
    token_type: Literal["bearer"] = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=16, max_length=512)
    device_id: str | None = Field(default=None, max_length=128)

      
class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_blocked: bool
    is_admin: bool = Field(
        validation_alias=AliasChoices("is_admin", "isAdmin"),
        serialization_alias="isAdmin",
    )

    class Config:
        from_attributes = True
