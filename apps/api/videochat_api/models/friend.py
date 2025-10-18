from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref


from videochat_api.db.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from .user import User


class FriendStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    BLOCKED = "blocked"


class FriendRelationship(Base):
    __tablename__ = "friends"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friends_request_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False
    )
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    addressee_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[FriendStatus] = mapped_column(
        Enum(
            FriendStatus,
            name="friend_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=FriendStatus.PENDING,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    requester: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requester_id],
        backref=backref("outgoing_friend_requests", passive_deletes=True),
        passive_deletes=True,
    )

    addressee: Mapped["User"] = relationship(
        "User",
        foreign_keys=[addressee_id],
        backref=backref("incoming_friend_requests", passive_deletes=True),
        passive_deletes=True,
    )
