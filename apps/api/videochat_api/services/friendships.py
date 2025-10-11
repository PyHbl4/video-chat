from __future__ import annotations

from collections.abc import Iterable
from typing import Sequence
import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videochat_api.models import FriendRelationship, FriendStatus as FriendModelStatus


async def list_friendships(
    db: AsyncSession,
    user_id: int,
    status: FriendModelStatus | None = None,
) -> Sequence[FriendRelationship]:
    stmt = (
        select(FriendRelationship)
        .options(
            selectinload(FriendRelationship.requester),
            selectinload(FriendRelationship.addressee),
        )
        .where(
            or_(
                FriendRelationship.requester_id == user_id,
                FriendRelationship.addressee_id == user_id,
            )
        )
        .order_by(FriendRelationship.created_at.desc())
    )
    if status is not None:
        stmt = stmt.where(FriendRelationship.status == status)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_friendship_by_id(
    db: AsyncSession,
    friendship_id: uuid.UUID,
) -> FriendRelationship | None:
    stmt = (
        select(FriendRelationship)
        .options(
            selectinload(FriendRelationship.requester),
            selectinload(FriendRelationship.addressee),
        )
        .where(FriendRelationship.id == friendship_id)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def find_mutual_friendship(
    db: AsyncSession,
    user_id: int,
    target_user_id: int,
) -> FriendRelationship | None:
    stmt = select(FriendRelationship).where(
        or_(
            and_(
                FriendRelationship.requester_id == user_id,
                FriendRelationship.addressee_id == target_user_id,
            ),
            and_(
                FriendRelationship.requester_id == target_user_id,
                FriendRelationship.addressee_id == user_id,
            ),
        )
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_friend_user_ids(
    db: AsyncSession,
    user_id: int,
    status: FriendModelStatus | None = FriendModelStatus.ACCEPTED,
) -> set[int]:
    stmt = select(FriendRelationship).where(
        or_(
            FriendRelationship.requester_id == user_id,
            FriendRelationship.addressee_id == user_id,
        )
    )
    if status is not None:
        stmt = stmt.where(FriendRelationship.status == status)

    result = await db.execute(stmt)
    friendships = result.scalars().all()

    friend_ids: set[int] = set()
    for friendship in friendships:
        if friendship.requester_id == user_id:
            friend_ids.add(friendship.addressee_id)
        else:
            friend_ids.add(friendship.requester_id)
    return friend_ids
