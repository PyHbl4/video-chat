from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.dependencies import get_current_user, get_session_dependency
from videochat_api.models import FriendRelationship, FriendStatus as FriendModelStatus, User
from videochat_api.schemas import Friend as FriendSchema
from videochat_api.schemas import FriendRequestPayload, FriendStatus, FriendUser

router = APIRouter(prefix="/friends", tags=["friends"])


def _to_friend_user(user: User | None) -> FriendUser | None:
    if user is None:
        return None

    return FriendUser(
        id=str(user.id),
        username=user.username,
        display_name=user.username,
        avatar_url=None,
        bio=None,
        created_at=user.created_at,
    )


@router.post("/request", response_model=FriendSchema, status_code=status.HTTP_202_ACCEPTED)
async def request_friend(
    payload: FriendRequestPayload,
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> FriendSchema:
    try:
        target_user_id = int(payload.target_user_id)
    except ValueError as exc:  # pragma: no cover - defensive branch
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target user") from exc

    if current_user.id == target_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot befriend yourself")

    target_user = await db.get(User, target_user_id)
    if target_user is None or target_user.is_blocked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    stmt = select(FriendRelationship).where(
        or_(
            and_(
                FriendRelationship.requester_id == current_user.id,
                FriendRelationship.addressee_id == target_user.id,
            ),
            and_(
                FriendRelationship.requester_id == target_user.id,
                FriendRelationship.addressee_id == current_user.id,
            ),
        )
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()

    now = datetime.now(timezone.utc)

    if existing:
        if existing.status == FriendModelStatus.ACCEPTED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Users are already friends")
        if existing.status == FriendModelStatus.PENDING:
            if existing.requester_id == current_user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request already sent")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Incoming request pending")
        if existing.status == FriendModelStatus.BLOCKED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friendship is blocked")

        existing.requester_id = current_user.id
        existing.addressee_id = target_user.id
        existing.status = FriendModelStatus.PENDING
        existing.created_at = now
        existing.responded_at = None
        friend = existing
    else:
        friend = FriendRelationship(
            requester_id=current_user.id,
            addressee_id=target_user.id,
            status=FriendModelStatus.PENDING,
        )
        db.add(friend)

    await db.flush()
    await db.commit()
    await db.refresh(friend)

    requester = current_user if friend.requester_id == current_user.id else target_user
    addressee = target_user if friend.addressee_id == target_user.id else current_user

    return FriendSchema(
        id=str(friend.id),
        requester_id=str(friend.requester_id),
        addressee_id=str(friend.addressee_id),
        status=FriendStatus(friend.status.value),
        created_at=friend.created_at,
        responded_at=friend.responded_at,
        requester=_to_friend_user(requester),
        addressee=_to_friend_user(addressee),
    )
