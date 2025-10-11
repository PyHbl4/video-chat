from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.dependencies import get_current_user, get_session_dependency
from videochat_api.models import User
from videochat_api.schemas import UserSearchItem, UserSearchResponse

router = APIRouter(prefix="/users", tags=["users"])

_MIN_QUERY_LENGTH = 2
_DEFAULT_LIMIT = 10
_MAX_LIMIT = 50


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
