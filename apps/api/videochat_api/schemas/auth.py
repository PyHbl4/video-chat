from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    identifier: str = Field(description="Username or email", min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AuthSession(BaseModel):
    csrf_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_blocked: bool

    class Config:
        from_attributes = True
