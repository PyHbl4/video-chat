from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from videochat_api.db.base import Base


class DeviceKind(str, enum.Enum):
    WEB = "web"
    DESKTOP = "desktop"
    TAURI = "tauri"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    identifier: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    kind: Mapped[DeviceKind] = mapped_column(Enum(DeviceKind, name="device_kind"), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    refresh_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sessions: Mapped[list["AuthSession"]] = relationship(
        "AuthSession", back_populates="device", cascade="all, delete-orphan"
    )
    user: Mapped["User"] = relationship("User", back_populates="devices")


from .session import AuthSession  # noqa: E402  circular import guard
from .user import User  # noqa: E402  circular import guard
