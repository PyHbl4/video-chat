from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20241005_000004"
down_revision: Union[str, None] = "20241005_000003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE room_status AS ENUM ('waiting', 'active', 'ending', 'closed', 'expired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_participant_role') THEN
        CREATE TYPE room_participant_role AS ENUM ('initiator', 'guest');
    END IF;
END
$$;
"""
    )

    room_status_enum = postgresql.ENUM(
        "waiting",
        "active",
        "ending",
        "closed",
        "expired",
        name="room_status",
        create_type=False,
    )
    participant_role_enum = postgresql.ENUM(
        "initiator",
        "guest",
        name="room_participant_role",
        create_type=False,
    )

    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("initiator_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", room_status_enum, nullable=False, server_default="waiting"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_rooms_initiator_id"), "rooms", ["initiator_id"], unique=False)

    op.create_table(
        "room_participants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", participant_role_enum, nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("room_id", "user_id", name="uq_room_participant_user"),
    )
    op.create_index(op.f("ix_room_participants_room_id"), "room_participants", ["room_id"], unique=False)
    op.create_index(op.f("ix_room_participants_user_id"), "room_participants", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_room_participants_user_id"), table_name="room_participants")
    op.drop_index(op.f("ix_room_participants_room_id"), table_name="room_participants")
    op.drop_table("room_participants")

    op.drop_index(op.f("ix_rooms_initiator_id"), table_name="rooms")
    op.drop_table("rooms")

    op.execute("DROP TYPE IF EXISTS room_participant_role")
    op.execute("DROP TYPE IF EXISTS room_status")
