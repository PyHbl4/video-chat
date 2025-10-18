from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from videochat_api.db.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from .user import User


class RoomStatus(str, enum.Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    ENDING = "ending"
    CLOSED = "closed"
    EXPIRED = "expired"


class RoomParticipantRole(str, enum.Enum):
    INITIATOR = "initiator"
    GUEST = "guest"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False
    )
    initiator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[RoomStatus] = mapped_column(
        Enum(
            RoomStatus,
            name="room_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=RoomStatus.WAITING,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    initiator: Mapped["User"] = relationship(
        "User", backref="initiated_rooms", foreign_keys=[initiator_id]
    )
    target_user: Mapped["User | None"] = relationship(
        "User", backref="targeted_rooms", foreign_keys=[target_user_id]
    )
    participants: Mapped[list["RoomParticipant"]] = relationship(
        "RoomParticipant",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="RoomParticipant.joined_at",
        passive_deletes=True,
    )


class RoomParticipant(Base):
    __tablename__ = "room_participants"
    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_room_participant_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[RoomParticipantRole] = mapped_column(
        Enum(
            RoomParticipantRole,
            name="room_participant_role",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    room: Mapped["Room"] = relationship(
        "Room",
        back_populates="participants",
        passive_deletes=True,
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="room_participations",
        passive_deletes=True,
    )
