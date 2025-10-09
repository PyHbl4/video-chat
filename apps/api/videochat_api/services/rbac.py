from __future__ import annotations

import enum
import logging
from dataclasses import dataclass
from typing import Iterable, Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.config import settings
from videochat_api.models import (
    ModerationAction,
    ModerationEvent,
    RoleName,
    User,
    UserRole,
)

logger = logging.getLogger(__name__)


class RoleUpdateMode(str, enum.Enum):
    REPLACE = "replace"
    ADD = "add"
    REMOVE = "remove"


@dataclass(slots=True)
class RoleUpdateResult:
    added: set[RoleName]
    removed: set[RoleName]
    final_roles: set[RoleName]


class RoleService:
    def __init__(self, *, superusers: Sequence[str] | None = None) -> None:
        self._superusers = {value.lower() for value in (superusers or []) if value}

    def is_superuser(self, user: User) -> bool:
        email = (user.email or "").lower()
        username = (user.username or "").lower()
        return email in self._superusers or username in self._superusers

    async def list_roles(self, db: AsyncSession, user_id: int) -> set[RoleName]:
        result = await db.execute(
            select(UserRole.role).where(UserRole.user_id == user_id)
        )
        return {row[0] for row in result.all()}

    async def ensure_role(
        self,
        db: AsyncSession,
        user_id: int,
        role: RoleName,
    ) -> None:
        result = await db.execute(
            select(UserRole.role).where(UserRole.user_id == user_id, UserRole.role == role)
        )
        if result.scalar_one_or_none() is None:
            db.add(UserRole(user_id=user_id, role=role))
            await db.flush()

    async def update_user_roles(
        self,
        db: AsyncSession,
        *,
        actor: User,
        target: User,
        roles: Iterable[RoleName],
        mode: RoleUpdateMode,
    ) -> RoleUpdateResult:
        current_roles = await self.list_roles(db, target.id)
        desired_roles = set(roles)

        if mode is RoleUpdateMode.REPLACE:
            final_roles = set(desired_roles)
        elif mode is RoleUpdateMode.ADD:
            final_roles = current_roles | desired_roles
        elif mode is RoleUpdateMode.REMOVE:
            final_roles = current_roles - desired_roles
        else:
            raise ValueError(f"Unsupported role update mode: {mode}")

        final_roles.add(RoleName.USER)

        roles_to_add = final_roles - current_roles
        roles_to_remove = current_roles - final_roles

        if not roles_to_add and not roles_to_remove:
            return RoleUpdateResult(
                added=set(),
                removed=set(),
                final_roles=current_roles,
            )

        if roles_to_remove:
            await db.execute(
                delete(UserRole).where(
                    UserRole.user_id == target.id,
                    UserRole.role.in_(roles_to_remove),
                )
            )

        for role in roles_to_add:
            db.add(UserRole(user_id=target.id, role=role))

        await db.flush()

        for role in sorted(roles_to_add, key=lambda r: r.value):
            db.add(
                ModerationEvent(
                    target_user_id=target.id,
                    actor_user_id=actor.id,
                    action=ModerationAction.ROLE_GRANT,
                    payload={"role": role.value},
                )
            )
            logger.info(
                "Granted role",
                extra={
                    "actor_id": actor.id,
                    "target_id": target.id,
                    "role": role.value,
                },
            )

        for role in sorted(roles_to_remove, key=lambda r: r.value):
            db.add(
                ModerationEvent(
                    target_user_id=target.id,
                    actor_user_id=actor.id,
                    action=ModerationAction.ROLE_REVOKE,
                    payload={"role": role.value},
                )
            )
            logger.info(
                "Revoked role",
                extra={
                    "actor_id": actor.id,
                    "target_id": target.id,
                    "role": role.value,
                },
            )

        return RoleUpdateResult(
            added=roles_to_add,
            removed=roles_to_remove,
            final_roles=final_roles,
        )


role_service = RoleService(superusers=settings.admin_superusers)

__all__ = [
    "RoleService",
    "RoleUpdateMode",
    "RoleUpdateResult",
    "role_service",
]
