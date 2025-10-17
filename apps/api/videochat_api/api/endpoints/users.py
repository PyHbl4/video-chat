from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videochat_api.auth.session import session_manager
from videochat_api.dependencies import (
    get_current_admin_user,
    get_current_user,
    get_session_dependency,
)
from videochat_api.models import User
from videochat_api.schemas import (
    UserDevice,
    UserListItem,
    UserListResponse,
    UserSearchItem,
    UserSearchResponse,
    UserSession,
)

router = APIRouter(prefix="/users", tags=["users"])

_MIN_QUERY_LENGTH = 2
_DEFAULT_LIMIT = 10
_MAX_LIMIT = 50
_ALLOWED_INCLUDES = {"devices", "sessions"}


@router.get("/", response_model=UserListResponse)
async def list_users(
    include: list[str] = Query(default_factory=list),
    db: AsyncSession = Depends(get_session_dependency),
    _: User = Depends(get_current_admin_user),
) -> UserListResponse:
    include_set = {value.lower() for value in include}
    invalid = include_set - _ALLOWED_INCLUDES
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимые значения include: {', '.join(sorted(invalid))}",
        )

    load_options = []
    if "devices" in include_set:
        load_options.append(selectinload(User.devices))
    if "sessions" in include_set:
        load_options.append(selectinload(User.sessions))

    stmt = select(User).options(*load_options).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    users = result.scalars().unique().all()

    items: list[UserListItem] = []
    for user in users:
        devices_payload = None
        if "devices" in include_set:
            devices_payload = [
                UserDevice(
                    id=str(device.id),
                    identifier=device.identifier,
                    kind=device.kind.value,
                    display_name=device.display_name,
                    user_agent=device.user_agent,
                    last_seen_at=device.last_seen_at,
                    created_at=device.created_at,
                    updated_at=device.updated_at,
                    revoked_at=device.revoked_at,
                )
                for device in user.devices
            ]

        sessions_payload = None
        if "sessions" in include_set:
            sessions_payload = [
                UserSession(
                    id=session.id,
                    kind=session.kind.value,
                    device_id=str(session.device_id) if session.device_id is not None else None,
                    expires_at=session.expires_at,
                    last_seen_at=session.last_seen_at,
                    created_at=session.created_at,
                    revoked_at=session.revoked_at,
                    ip_address=session.ip_address,
                    user_agent=session.user_agent,
                )
                for session in user.sessions
            ]

        items.append(
            UserListItem(
                id=str(user.id),
                username=user.username,
                email=user.email,
                is_blocked=user.is_blocked,
                is_admin=user.is_admin,
                created_at=user.created_at,
                updated_at=user.updated_at,
                devices=devices_payload,
                sessions=sessions_payload,
            )
        )

    return UserListResponse(users=items)


@router.get("/search", response_model=UserSearchResponse)
async def search_users(
    *,
    q: str = Query(..., min_length=_MIN_QUERY_LENGTH, max_length=100),
    limit: int = Query(_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT),
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> UserSearchResponse:
    query = q.strip()
    if len(query) < _MIN_QUERY_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must be at least 2 characters",
        )

    pattern = f"%{query.lower()}%"
    stmt = (
        select(User)
        .where(User.is_blocked.is_(False))
        .where(func.lower(User.username).like(pattern))
        .where(User.id != current_user.id)
        .order_by(func.lower(User.username))
        .limit(limit)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()

    items = [
        UserSearchItem(
            id=str(user.id),
            username=user.username,
            display_name=user.username,
            avatar_url=None,
            bio=None,
            created_at=user.created_at,
        )
        for user in users
    ]

    return UserSearchResponse(items=items)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> Response:
    try:
        target_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный идентификатор пользователя",
        )

    result = await db.execute(select(User).where(User.id == target_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    is_owner = current_user.id == target.id
    if not (current_user.is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления пользователя",
        )

    await session_manager.revoke_user_sessions(db, target.id)
    await db.delete(target)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
