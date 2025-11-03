"""replace is_admin with role enum"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20241020_000007"
down_revision: Union[str, None] = "20241015_000006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = sa.Enum("user", "moderator", "admin", name="userrole")


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            user_role_enum,
            nullable=False,
            server_default="user",
        ),
    )

    users_table = sa.table(
        "users",
        sa.column("id", sa.Integer()),
        sa.column("is_admin", sa.Boolean()),
        sa.column("role", user_role_enum),
    )

    op.execute(
        users_table.update()
        .where(users_table.c.is_admin.is_(True))
        .values(role="admin")
    )
    op.execute(
        users_table.update()
        .where(users_table.c.is_admin.isnot(True))
        .values(role="user")
    )

    op.drop_column("users", "is_admin")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    users_table = sa.table(
        "users",
        sa.column("id", sa.Integer()),
        sa.column("is_admin", sa.Boolean()),
        sa.column("role", user_role_enum),
    )

    op.execute(
        users_table.update()
        .where(users_table.c.role == "admin")
        .values(is_admin=True)
    )
    op.execute(
        users_table.update()
        .where(users_table.c.role != "admin")
        .values(is_admin=False)
    )

    op.drop_column("users", "role")
    bind = op.get_bind()
    user_role_enum.drop(bind, checkfirst=True)
