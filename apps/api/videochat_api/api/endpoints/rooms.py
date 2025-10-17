from __future__ import annotations

import uuid
from enum import Enum
from typing import Any, Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.dependencies import (
    get_current_admin_user,
    get_current_user,
    get_redis,
    get_session_dependency,
)
from videochat_api.models import Room as RoomModel, User
from videochat_api.schemas import (
    Room as RoomSchema,
    RoomCreatePayload,
    RoomCreateResponse,
    RoomParticipant as RoomParticipantSchema,
    RoomParticipantRole as RoomParticipantRoleSchema,
    RoomStatus as RoomStatusSchema,
    RoomStatusResponse,
    RoomsListResponse,
)
from videochat_api.services.rooms import (
    LeaveResult,
    RoomConflictError,
    RoomForbiddenError,
    RoomNotFoundError,
    RoomService,
)
from videochat_api.websocket.server import sio

router = APIRouter(prefix="/rooms", tags=["rooms"])

EnumType = TypeVar("EnumType", bound=Enum)


def _coerce_enum(value: Any, enum_cls: Type[EnumType]) -> EnumType:
    if isinstance(value, enum_cls):
        return value
    if isinstance(value, Enum):
        value = value.value
    if isinstance(value, str):
        try:
            return enum_cls(value)
        except ValueError as exc:  # pragma: no cover - defensive branch
            raise ValueError(f"Unknown value {value!r} for {enum_cls.__name__}") from exc
    raise TypeError(f"Unsupported enum value {value!r} for {enum_cls.__name__}")


def _model_to_schema(room_model: RoomModel) -> RoomSchema:
    participants = [
        RoomParticipantSchema(
            user_id=str(part.user_id),
            role=_coerce_enum(part.role, RoomParticipantRoleSchema),
            joined_at=part.joined_at,
            left_at=part.left_at,
        )
        for part in sorted(room_model.participants, key=lambda p: p.joined_at)
    ]
    return RoomSchema(
        id=str(room_model.id),
        status=_coerce_enum(room_model.status, RoomStatusSchema),
        initiator_id=str(room_model.initiator_id),
        target_user_id=str(room_model.target_user_id) if room_model.target_user_id is not None else None,
        created_at=room_model.created_at,
        updated_at=room_model.updated_at,
        closed_at=room_model.closed_at,
        participants=participants,
    )


def _build_service(db: AsyncSession, redis: Redis | None) -> RoomService:
    return RoomService(db=db, redis=redis)


@router.get("/", response_model=RoomsListResponse)
async def list_active_rooms(
    db: AsyncSession = Depends(get_session_dependency),
    redis: Redis | None = Depends(get_redis),
    _: User = Depends(get_current_admin_user),
) -> RoomsListResponse:
    service = _build_service(db, redis)
    rooms = await service.list_active_rooms()
    return RoomsListResponse(rooms=[_model_to_schema(room) for room in rooms])


@router.post("/", response_model=RoomCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreatePayload,
    db: AsyncSession = Depends(get_session_dependency),
    redis: Redis | None = Depends(get_redis),
    current_user: User = Depends(get_current_user),
) -> RoomCreateResponse:
    try:
        target_id = int(payload.target_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный идентификатор пользователя") from exc

    target = await db.get(User, target_id)
    if target is None or target.is_blocked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    service = _build_service(db, redis)
    try:
        room = await service.create_room(current_user, target)
    except RoomForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except RoomConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    room_schema = _model_to_schema(room)

    await sio.emit(
        "room:invited",
        {
            "room": room_schema.model_dump(mode="json", by_alias=True),
            "fromUserId": str(current_user.id),
        },
        room=f"user:{target.id}",
    )

    return RoomCreateResponse(room=room_schema)


@router.get("/me", response_model=RoomsListResponse)
async def get_my_rooms(
    db: AsyncSession = Depends(get_session_dependency),
    redis: Redis | None = Depends(get_redis),
    current_user: User = Depends(get_current_user),
) -> RoomsListResponse:
    service = _build_service(db, redis)
    rooms = await service.list_rooms_for_user(current_user.id)
    return RoomsListResponse(rooms=[_model_to_schema(room) for room in rooms])


@router.get("/{room_id}", response_model=RoomStatusResponse)
async def get_room_status(
    room_id: str,
    db: AsyncSession = Depends(get_session_dependency),
    redis: Redis | None = Depends(get_redis),
    current_user: User = Depends(get_current_user),
) -> RoomStatusResponse:
    try:
        room_uuid = uuid.UUID(room_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена") from exc

    service = _build_service(db, redis)
    try:
        room = await service.get_room_for_user(room_uuid, current_user.id)
    except RoomNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RoomForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return RoomStatusResponse(room=_model_to_schema(room))


@router.post("/{room_id}/leave", response_model=RoomStatusResponse)
async def leave_room(
    room_id: str,
    db: AsyncSession = Depends(get_session_dependency),
    redis: Redis | None = Depends(get_redis),
    current_user: User = Depends(get_current_user),
) -> RoomStatusResponse:
    try:
        room_uuid = uuid.UUID(room_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена") from exc

    service = _build_service(db, redis)
    try:
        result: LeaveResult = await service.leave_room(room_uuid, current_user)
    except RoomNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RoomForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    room_schema = _model_to_schema(result.room)

    if result.changed:
        await sio.emit(
            "room:user_left",
            {
                "room": room_schema.model_dump(mode="json", by_alias=True),
                "userId": str(current_user.id),
            },
            room=f"video-room:{room_schema.id}",
        )

    return RoomStatusResponse(room=room_schema)


@router.post("/{room_id}/join", response_model=RoomStatusResponse)
async def join_room(
    room_id: str,
    db: AsyncSession = Depends(get_session_dependency),
    redis: Redis | None = Depends(get_redis),
    current_user: User = Depends(get_current_user),
) -> RoomStatusResponse:
    try:
        room_uuid = uuid.UUID(room_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Комната не найдена") from exc

    service = _build_service(db, redis)
    try:
        room, changed = await service.join_room(room_uuid, current_user)
    except RoomNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RoomForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except RoomConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    room_schema = _model_to_schema(room)

    if changed:
        payload = {
            "room": room_schema.model_dump(mode="json", by_alias=True),
            "userId": str(current_user.id),
        }
        await sio.emit(
            "room:user_joined",
            payload,
            room=f"video-room:{room_schema.id}",
        )

        recipient_ids = {
            participant.user_id
            for participant in room_schema.participants
            if participant.user_id != str(current_user.id)
        }

        for recipient_id in recipient_ids:
            await sio.emit(
                "room:user_joined",
                payload,
                room=f"user:{recipient_id}",
            )

    return RoomStatusResponse(room=room_schema)
