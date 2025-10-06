from __future__ import annotations

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from videochat_api.db.base import Base


class SessionKind(str, enum.Enum):
    WEB = "web"
    DESKTOP = "desktop"
    TAURI = "tauri"


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"), nullable=True, index=True
    )
    kind: Mapped[SessionKind] = mapped_column(Enum(SessionKind, name="session_kind"), nullable=False)
    session_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    csrf_token: Mapped[str | None] = mapped_column(String(128), nullable=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    refresh_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    device: Mapped[Device | None] = relationship("Device", back_populates="sessions")
    user: Mapped["User"] = relationship("User", back_populates="sessions")


from .device import Device  # noqa: E402  circular import guard
from .user import User  # noqa: E402  circular import guard
