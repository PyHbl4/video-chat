"""Add RBAC tables and moderation events"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250214_000003_add_rbac_tables"
down_revision = "20241005_000002_add_devices_and_sessions"
branch_labels = None
depends_on = None


user_role_enum = sa.Enum("user", "moderator", "admin", name="user_role")
moderation_action_enum = sa.Enum(
    "block", "unblock", "role_grant", "role_revoke", name="moderation_action"
)


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    moderation_action_enum.create(bind, checkfirst=True)

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role"),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"], unique=False)
    op.create_index("ix_user_roles_role", "user_roles", ["role"], unique=False)

    op.create_table(
        "moderation_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("target_user_id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("action", moderation_action_enum, nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_moderation_events_target_user_id",
        "moderation_events",
        ["target_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_moderation_events_actor_user_id",
        "moderation_events",
        ["actor_user_id"],
        unique=False,
    )

    op.execute(
        sa.text(
            """
            INSERT INTO user_roles (user_id, role, assigned_at)
            SELECT id, 'user', CURRENT_TIMESTAMP
            FROM users
            ON CONFLICT (user_id, role) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_moderation_events_actor_user_id", table_name="moderation_events")
    op.drop_index("ix_moderation_events_target_user_id", table_name="moderation_events")
    op.drop_table("moderation_events")

    op.drop_index("ix_user_roles_role", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_table("user_roles")

    bind = op.get_bind()
    moderation_action_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
