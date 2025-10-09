from __future__ import annotations

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from videochat_api.db.base import Base


if TYPE_CHECKING:
    from .user import User


class ModerationAction(str, enum.Enum):
    BLOCK = "block"
    UNBLOCK = "unblock"
    ROLE_GRANT = "role_grant"
    ROLE_REVOKE = "role_revoke"


class ModerationEvent(Base):
    __tablename__ = "moderation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[ModerationAction] = mapped_column(
        Enum(ModerationAction, name="moderation_action", create_constraint=False),
        nullable=False,
    )
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    target_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[target_user_id],
        back_populates="moderation_events",
    )
    actor_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[actor_user_id],
        back_populates="moderation_actions",
    )


__all__ = ["ModerationAction", "ModerationEvent"]
