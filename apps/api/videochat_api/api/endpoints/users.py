from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.dependencies import get_current_user, get_session_dependency
from videochat_api.models import User, UserPreferences
from videochat_api.schemas import (
    UserPreferencesPayload,
    UserPreferencesRead,
    UserPreferencesUpdate,
    UserSearchItem,
    UserSearchResponse,
)

router = APIRouter(prefix="/users", tags=["users"])

_MIN_QUERY_LENGTH = 2
_DEFAULT_LIMIT = 10
_MAX_LIMIT = 50


def _default_preferences() -> UserPreferencesPayload:
    return UserPreferencesPayload()


def _parse_preferences(settings: dict[str, Any] | None) -> UserPreferencesPayload:
    if not isinstance(settings, dict):
        return _default_preferences()
    return UserPreferencesPayload.model_validate(settings)


def _merge_preferences(
    base: dict[str, Any], updates: dict[str, Any]
) -> dict[str, Any]:
    merged: dict[str, Any] = {**base}
    for key, value in updates.items():
        if isinstance(value, dict):
            existing = merged.get(key)
            if not isinstance(existing, dict):
                existing = {}
            merged[key] = _merge_preferences(existing, value)
        else:
            merged[key] = value
    return merged


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


@router.get("/preferences", response_model=UserPreferencesRead)
async def get_user_preferences(
    *,
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> UserPreferencesRead:
    preferences = await db.get(UserPreferences, current_user.id)
    if preferences is None:
        payload = _default_preferences()
        preferences = UserPreferences(
            user_id=current_user.id,
            settings=payload.model_dump(),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(preferences)
        await db.commit()
        await db.refresh(preferences)
    else:
        payload = _parse_preferences(preferences.settings)

    return UserPreferencesRead(
        theme=payload.theme,
        sidebar=payload.sidebar,
        audio=payload.audio,
        video=payload.video,
        notifications=payload.notifications,
        updated_at=preferences.updated_at,
    )


@router.put("/preferences", response_model=UserPreferencesRead)
async def update_user_preferences(
    *,
    body: UserPreferencesUpdate,
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> UserPreferencesRead:
    preferences = await db.get(UserPreferences, current_user.id)
    if preferences is None:
        preferences = UserPreferences(
            user_id=current_user.id,
            settings=_default_preferences().model_dump(),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(preferences)
        await db.flush()

    existing_payload = _parse_preferences(preferences.settings)
    updates = body.model_dump(exclude_unset=True, exclude_none=True)
    updates.pop("updated_at", None)

    merged_dict = _merge_preferences(existing_payload.model_dump(), updates)
    merged_payload = UserPreferencesPayload.model_validate(merged_dict)

    now = datetime.now(timezone.utc)
    preferences.settings = merged_payload.model_dump()
    preferences.updated_at = now

    await db.commit()
    await db.refresh(preferences)

    return UserPreferencesRead(
        theme=merged_payload.theme,
        sidebar=merged_payload.sidebar,
        audio=merged_payload.audio,
        video=merged_payload.video,
        notifications=merged_payload.notifications,
        updated_at=preferences.updated_at,
    )
