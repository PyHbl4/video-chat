from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20241005_000002"
down_revision: Union[str, None] = "20240912_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_kind') THEN
        CREATE TYPE device_kind AS ENUM ('web', 'desktop', 'tauri');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_kind') THEN
        CREATE TYPE session_kind AS ENUM ('web', 'desktop', 'tauri');
    END IF;
END
$$;
"""
    )

    device_enum = postgresql.ENUM("web", "desktop", "tauri", name="device_kind", create_type=False)
    session_enum = postgresql.ENUM("web", "desktop", "tauri", name="session_kind", create_type=False)

    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("identifier", sa.String(length=128), nullable=False),
        sa.Column("kind", device_enum, nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=True),
        sa.Column("refresh_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "identifier", name="uq_devices_user_identifier"),
    )
    op.create_index(op.f("ix_devices_user_id"), "devices", ["user_id"], unique=False)
    op.create_index(op.f("ix_devices_identifier"), "devices", ["identifier"], unique=False)
    op.create_index(op.f("ix_devices_refresh_token_hash"), "devices", ["refresh_token_hash"], unique=False)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=True),
        sa.Column("kind", session_enum, nullable=False),
        sa.Column("session_token_hash", sa.String(length=128), nullable=True, unique=True),
        sa.Column("csrf_token", sa.String(length=128), nullable=True),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=True, unique=True),
        sa.Column("refresh_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)
    op.create_index(op.f("ix_auth_sessions_device_id"), "auth_sessions", ["device_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_sessions_device_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index(op.f("ix_devices_refresh_token_hash"), table_name="devices")
    op.drop_index(op.f("ix_devices_identifier"), table_name="devices")
    op.drop_index(op.f("ix_devices_user_id"), table_name="devices")
    op.drop_table("devices")

    op.execute("DROP TYPE IF EXISTS session_kind")
    op.execute("DROP TYPE IF EXISTS device_kind")
