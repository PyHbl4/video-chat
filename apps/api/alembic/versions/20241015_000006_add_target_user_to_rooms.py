"""add target user to rooms

Revision ID: 20241015_000006
Revises: 20241010_000005
Create Date: 2024-10-15 00:00:06.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20241015_000006"
down_revision: Union[str, None] = "20241010_000005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rooms",
        sa.Column(
            "target_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(op.f("ix_rooms_target_user_id"), "rooms", ["target_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_rooms_target_user_id"), table_name="rooms")
    op.drop_column("rooms", "target_user_id")
