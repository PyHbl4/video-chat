from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20241005_000003"
down_revision: Union[str, None] = "20241005_000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_status') THEN
        CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
    END IF;
END
$$;
"""
    )

    friend_status_enum = postgresql.ENUM(
        "pending", "accepted", "declined", "blocked", name="friend_status", create_type=False
    )

    op.create_table(
        "friends",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("addressee_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", friend_status_enum, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("requester_id", "addressee_id", name="uq_friends_request_pair"),
    )
    op.create_index(op.f("ix_friends_requester_id"), "friends", ["requester_id"], unique=False)
    op.create_index(op.f("ix_friends_addressee_id"), "friends", ["addressee_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_friends_addressee_id"), table_name="friends")
    op.drop_index(op.f("ix_friends_requester_id"), table_name="friends")
    op.drop_table("friends")
    op.execute("DROP TYPE IF EXISTS friend_status")
