from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.dependencies import get_current_user, get_session_dependency
from videochat_api.models import FriendRelationship, FriendStatus as FriendModelStatus, User
from videochat_api.schemas import (
    Friend as FriendSchema,
    FriendDecisionPayload,
    FriendRequestPayload,
    FriendStatus,
    FriendUser,
    ListFriendsResponse,
)
from videochat_api.services.friendships import (
    find_mutual_friendship,
    get_friendship_by_id,
    list_friendships,
)
from videochat_api.websocket.server import sio

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


async def _emit_friend_event(
    event: str,
    friend: FriendSchema,
    recipients: Iterable[int],
    reason: str | None = None,
) -> None:
    payload = {"friend": friend.model_dump(by_alias=True)}
    if reason:
        payload["reason"] = reason

    for user_id in set(recipients):
        await sio.emit(event, payload, room=f"user:{user_id}")


def _to_friend_schema(friend: FriendRelationship) -> FriendSchema:
    return FriendSchema(
        id=str(friend.id),
        requester_id=str(friend.requester_id),
        addressee_id=str(friend.addressee_id),
        status=FriendStatus(friend.status.value),
        created_at=friend.created_at,
        responded_at=friend.responded_at,
        requester=_to_friend_user(getattr(friend, "requester", None)),
        addressee=_to_friend_user(getattr(friend, "addressee", None)),
    )


@router.get("/", response_model=ListFriendsResponse)
async def list_friends(
    status_filter: FriendStatus | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> ListFriendsResponse:
    status_model = (
        FriendModelStatus(status_filter.value)
        if status_filter is not None
        else None
    )
    friendships = await list_friendships(db, current_user.id, status_model)
    items = [_to_friend_schema(friendship) for friendship in friendships]
    return ListFriendsResponse(items=items)


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

    existing = await find_mutual_friendship(db, current_user.id, target_user.id)

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
    await db.refresh(friend, attribute_names=["requester", "addressee"])

    friend_schema = _to_friend_schema(friend)

    await _emit_friend_event(
        "friends:request",
        friend_schema,
        recipients=[friend.addressee_id],
        reason=f"{current_user.username} отправил вам заявку в друзья",
    )

    return friend_schema


@router.post("/accept", response_model=FriendSchema)
async def accept_friend(
    payload: FriendDecisionPayload,
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> FriendSchema:
    try:
        request_id = uuid.UUID(payload.request_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request id") from exc

    friend = await get_friendship_by_id(db, request_id)
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")

    if friend.addressee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot accept this request")

    if friend.status != FriendModelStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request is not pending")

    friend.status = FriendModelStatus.ACCEPTED
    friend.responded_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(friend, attribute_names=["requester", "addressee"])

    friend_schema = _to_friend_schema(friend)

    await _emit_friend_event(
        "friends:accepted",
        friend_schema,
        recipients=[friend.requester_id, friend.addressee_id],
        reason=f"{current_user.username} принял заявку в друзья",
    )

    return friend_schema


@router.post("/decline", response_model=FriendSchema)
async def decline_friend(
    payload: FriendDecisionPayload,
    db: AsyncSession = Depends(get_session_dependency),
    current_user: User = Depends(get_current_user),
) -> FriendSchema:
    try:
        request_id = uuid.UUID(payload.request_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request id") from exc

    friend = await get_friendship_by_id(db, request_id)
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")

    if friend.addressee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot decline this request")

    if friend.status != FriendModelStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request is not pending")

    friend.status = FriendModelStatus.DECLINED
    friend.responded_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(friend, attribute_names=["requester", "addressee"])

    friend_schema = _to_friend_schema(friend)

    await _emit_friend_event(
        "friends:declined",
        friend_schema,
        recipients=[friend.requester_id],
        reason=f"{current_user.username} отклонил заявку в друзья",
    )

    return friend_schema
