from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Iterable

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videochat_api.auth.session import session_manager
from videochat_api.config import settings
from videochat_api.dependencies import (
    CurrentUserWithRoles,
    get_session_dependency,
    require_roles,
)
from videochat_api.models import ModerationAction, ModerationEvent, RoleName, User, UserRole
from videochat_api.schemas.admin import (
    ActiveCallsResponse,
    ActiveRoomsResponse,
    AdminUser,
    AdminUserListResponse,
    BlockUserRequest,
    RoleUpdateRequest,
    SortBy,
    SortOrder,
)
from videochat_api.services.rbac import role_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _serialize_user(user: User, roles: Iterable[RoleName]) -> AdminUser:
    return AdminUser(
        id=user.id,
        username=user.username,
        email=user.email,
        is_blocked=user.is_blocked,
        roles=sorted({role for role in roles}, key=lambda value: value.value),
        is_superuser=role_service.is_superuser(user),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int | None = Query(None, ge=1),
    q: str | None = Query(None, description="Поиск по username/email"),
    role: RoleName | None = Query(None),
    blocked: bool | None = Query(None),
    sort_by: SortBy = Query("created_at"),
    sort_order: SortOrder = Query("desc"),
    _current: User = Depends(require_roles(RoleName.MODERATOR, RoleName.ADMIN)),
    db: AsyncSession = Depends(get_session_dependency),
) -> AdminUserListResponse:
    effective_page_size = page_size or settings.admin_page_size_default
    effective_page_size = max(1, min(effective_page_size, settings.admin_page_size_max))

    filters: list[Any] = []
    if q:
        pattern = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(User.username).like(pattern),
                func.lower(User.email).like(pattern),
            )
        )
    if blocked is not None:
        filters.append(User.is_blocked.is_(blocked))
    if role is not None:
        filters.append(User.roles.any(UserRole.role == role))

    order_column = User.created_at if sort_by == "created_at" else User.username
    order_expression = order_column.desc() if sort_order == "desc" else order_column.asc()

    stmt = (
        select(User)
        .options(selectinload(User.roles))
        .where(*filters)
        .order_by(order_expression)
        .offset((page - 1) * effective_page_size)
        .limit(effective_page_size)
    )
    result = await db.execute(stmt)
    users = result.scalars().unique().all()

    count_stmt = select(func.count()).select_from(User).where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    items = [
        _serialize_user(user, [role.role for role in user.roles])
        for user in users
    ]

    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=effective_page_size,
    )


async def _load_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/users/{user_id}/block", response_model=AdminUser)
async def block_user(
    user_id: int,
    payload: BlockUserRequest | None = None,
    current_user: CurrentUserWithRoles = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_session_dependency),
) -> AdminUser:
    actor = current_user.user
    target = await _load_user_or_404(db, user_id)

    if role_service.is_superuser(target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify superuser")

    if target.is_blocked:
        roles = await role_service.list_roles(db, target.id)
        return _serialize_user(target, roles)

    target.is_blocked = True
    target.updated_at = datetime.now(timezone.utc)

    await session_manager.revoke_user_sessions(db, target.id)

    db.add(
        ModerationEvent(
            target_user_id=target.id,
            actor_user_id=actor.id,
            action=ModerationAction.BLOCK,
            payload={"reason": payload.reason} if payload and payload.reason else None,
        )
    )

    try:
        await db.flush()
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    logger.info(
        "Blocked user",
        extra={"actor_id": actor.id, "target_id": target.id, "reason": payload.reason if payload else None},
    )

    await db.refresh(target)
    roles = await role_service.list_roles(db, target.id)
    return _serialize_user(target, roles)


@router.post("/users/{user_id}/unblock", response_model=AdminUser)
async def unblock_user(
    user_id: int,
    payload: BlockUserRequest | None = None,
    current_user: CurrentUserWithRoles = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_session_dependency),
) -> AdminUser:
    actor = current_user.user
    target = await _load_user_or_404(db, user_id)

    if role_service.is_superuser(target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify superuser")

    if not target.is_blocked:
        roles = await role_service.list_roles(db, target.id)
        return _serialize_user(target, roles)

    target.is_blocked = False
    target.updated_at = datetime.now(timezone.utc)

    db.add(
        ModerationEvent(
            target_user_id=target.id,
            actor_user_id=actor.id,
            action=ModerationAction.UNBLOCK,
            payload={"reason": payload.reason} if payload and payload.reason else None,
        )
    )

    try:
        await db.flush()
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    logger.info(
        "Unblocked user",
        extra={"actor_id": actor.id, "target_id": target.id, "reason": payload.reason if payload else None},
    )

    await db.refresh(target)
    roles = await role_service.list_roles(db, target.id)
    return _serialize_user(target, roles)


@router.post("/users/{user_id}/roles", response_model=AdminUser)
async def update_user_roles(
    user_id: int,
    payload: RoleUpdateRequest,
    current_user: CurrentUserWithRoles = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_session_dependency),
) -> AdminUser:
    actor = current_user.user
    target = await _load_user_or_404(db, user_id)

    if role_service.is_superuser(target) and target.id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify superuser")

    desired_roles = set(payload.roles)

    result = await role_service.update_user_roles(
        db,
        actor=actor,
        target=target,
        roles=desired_roles,
        mode=payload.mode,
    )

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    logger.info(
        "Updated roles",
        extra={
            "actor_id": actor.id,
            "target_id": target.id,
            "added": sorted(role.value for role in result.added),
            "removed": sorted(role.value for role in result.removed),
            "mode": payload.mode.value,
        },
    )

    await db.refresh(target)
    roles = await role_service.list_roles(db, target.id)
    return _serialize_user(target, roles)


@router.get("/rooms/active", response_model=ActiveRoomsResponse)
async def get_active_rooms(
    _current: User = Depends(require_roles(RoleName.MODERATOR, RoleName.ADMIN)),
) -> ActiveRoomsResponse:
    """Заглушка для мониторинга активных комнат.

    TODO(api-rooms-calls): интегрировать с подсистемой комнат и Redis/Socket.IO.
    """

    return ActiveRoomsResponse(rooms=[], total=0, note="TODO: integrate with rooms service")


@router.get("/calls/active", response_model=ActiveCallsResponse)
async def get_active_calls(
    _current: User = Depends(require_roles(RoleName.MODERATOR, RoleName.ADMIN)),
) -> ActiveCallsResponse:
    """Заглушка для мониторинга активных звонков.

    TODO(api-rooms-calls): интегрировать с подсистемой звонков и сигналинга.
    """

    return ActiveCallsResponse(calls=[], total=0, note="TODO: integrate with calls service")
