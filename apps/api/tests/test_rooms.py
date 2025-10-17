from datetime import datetime, timezone
from types import SimpleNamespace
import uuid

import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from videochat_api.api.endpoints.rooms import _model_to_schema
from videochat_api.models import FriendRelationship, FriendStatus as FriendModelStatus, User
from videochat_api.schemas import (
    RoomParticipantRole as RoomParticipantRoleSchema,
    RoomStatus as RoomStatusSchema,
)
from videochat_api.services.rooms import RoomService


async def _login(client: AsyncClient, identifier: str, password: str = "Password123!") -> None:
    response = await client.post("/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200


async def _create_friendship(
    sessionmaker: async_sessionmaker[AsyncSession],
    requester_id: int,
    addressee_id: int,
    *,
    status: FriendModelStatus = FriendModelStatus.ACCEPTED,
) -> None:
    async with sessionmaker() as session:
        friendship = FriendRelationship(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status=status,
            created_at=datetime.now(timezone.utc),
        )
        session.add(friendship)
        await session.commit()


@pytest.mark.asyncio
async def test_create_room_invites_friend(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
    monkeypatch,
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)

    await _login(client, "alice")

    emitted: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        emitted.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.rooms.sio.emit", fake_emit)

    response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    assert response.status_code == 201

    payload = response.json()["room"]
    assert payload["status"] == "waiting"
    assert payload["initiatorId"] == str(alice.id)
    assert payload["participants"][0]["userId"] == str(alice.id)

    assert emitted, "ожидался сокет-сигнал приглашения"
    event, socket_payload, room = emitted[0]
    assert event == "room:invited"
    assert room == f"user:{bob.id}"
    assert socket_payload["room"]["id"] == payload["id"]


@pytest.mark.asyncio
async def test_room_status_available_for_invited_friend(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _login(client, "alice")
    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    room_id = create_response.json()["room"]["id"]

    status_response = await client.get(f"/rooms/{room_id}")
    assert status_response.status_code == 200
    assert status_response.json()["room"]["status"] == "waiting"

    await _login(client, "bob")
    invited_response = await client.get(f"/rooms/{room_id}")
    assert invited_response.status_code == 200
    invited_payload = invited_response.json()["room"]
    assert invited_payload["status"] == "waiting"
    participant_ids = [participant["userId"] for participant in invited_payload["participants"]]
    assert str(alice.id) in participant_ids


@pytest.mark.asyncio
async def test_room_status_forbidden_for_non_friend(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")
    eve = await user_factory("eve", "eve@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _login(client, "alice")
    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    room_id = create_response.json()["room"]["id"]

    await _login(client, "eve")
    forbidden = await client.get(f"/rooms/{room_id}")
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_room_status_forbidden_for_pending_friend(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")
    charlie = await user_factory("charlie", "charlie@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _create_friendship(
        sessionmaker,
        requester_id=charlie.id,
        addressee_id=alice.id,
        status=FriendModelStatus.PENDING,
    )

    await _login(client, "alice")
    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    room_id = create_response.json()["room"]["id"]

    await _login(client, "charlie")
    forbidden = await client.get(f"/rooms/{room_id}")
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_get_my_rooms_returns_waiting_for_initiator(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _login(client, "alice")

    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    assert create_response.status_code == 201
    room_id = create_response.json()["room"]["id"]

    my_rooms = await client.get("/rooms/me")
    assert my_rooms.status_code == 200
    payload = my_rooms.json()
    assert payload["rooms"], "ожидалась хотя бы одна комната"
    assert payload["rooms"][0]["id"] == room_id
    assert payload["rooms"][0]["status"] == "waiting"
    assert payload["rooms"][0]["targetUserId"] == str(bob.id)


@pytest.mark.asyncio
async def test_get_my_rooms_returns_waiting_for_invited_user(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _login(client, "alice")
    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    assert create_response.status_code == 201
    room_id = create_response.json()["room"]["id"]

    await _login(client, "bob")
    my_rooms = await client.get("/rooms/me")
    assert my_rooms.status_code == 200
    payload = my_rooms.json()
    assert payload["rooms"], "ожидалась хотя бы одна комната"
    room_payload = payload["rooms"][0]
    assert room_payload["id"] == room_id
    assert room_payload["status"] == "waiting"
    assert room_payload["targetUserId"] == str(bob.id)
    participant_ids = [participant["userId"] for participant in room_payload["participants"]]
    assert str(alice.id) in participant_ids


@pytest.mark.asyncio
async def test_get_my_rooms_returns_empty_when_user_has_no_room(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")
    charlie = await user_factory("charlie", "charlie@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _login(client, "alice")
    await client.post("/rooms", json={"targetUserId": str(bob.id)})

    await _login(client, "charlie")
    response = await client.get("/rooms/me")
    assert response.status_code == 200
    assert response.json()["rooms"] == []


@pytest.mark.asyncio
async def test_leave_room_moves_to_ending(
    client: AsyncClient,
    app: FastAPI,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
    monkeypatch,
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)

    await _login(client, "alice")
    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    assert create_response.status_code == 201
    room_id = create_response.json()["room"]["id"]

    redis = app.state.redis
    async with sessionmaker() as session:
        service = RoomService(session, redis)
        initiator = await session.get(User, alice.id)
        invitee = await session.get(User, bob.id)
        await service.join_room(uuid.UUID(room_id), invitee)

    await _login(client, "bob")

    emitted: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        emitted.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.rooms.sio.emit", fake_emit)

    leave_response = await client.post(f"/rooms/{room_id}/leave")
    assert leave_response.status_code == 200
    data = leave_response.json()["room"]
    assert data["status"] == "ending"
    assert data["participants"][-1]["userId"] == str(bob.id)
    assert data["participants"][-1]["leftAt"] is not None

    assert emitted, "ожидалось уведомление о выходе"
    event, payload, room = emitted[0]
    assert event == "room:user_left"
    assert room == f"video-room:{room_id}"
    assert payload["userId"] == str(bob.id)


@pytest.mark.asyncio
async def test_join_room_activates_and_is_idempotent(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
    monkeypatch,
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)

    await _login(client, "alice")
    create_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    assert create_response.status_code == 201
    room_id = create_response.json()["room"]["id"]

    emitted: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        emitted.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.rooms.sio.emit", fake_emit)

    await _login(client, "bob")

    join_response = await client.post(f"/rooms/{room_id}/join")
    assert join_response.status_code == 200

    join_payload = join_response.json()["room"]
    assert join_payload["status"] == "active"
    participant_ids = {participant["userId"] for participant in join_payload["participants"]}
    assert participant_ids == {str(alice.id), str(bob.id)}

    joined_events = [event for event in emitted if event[0] == "room:user_joined"]
    assert joined_events, "ожидалось уведомление о присоединении"
    assert any(
        room == f"video-room:{room_id}" and payload["userId"] == str(bob.id)
        for _, payload, room in joined_events
    )
    assert any(
        room == f"user:{alice.id}" and payload["userId"] == str(bob.id)
        for _, payload, room in joined_events
    )

    emitted_count = len(joined_events)

    second_join = await client.post(f"/rooms/{room_id}/join")
    assert second_join.status_code == 200
    assert second_join.json()["room"]["status"] == "active"

    joined_events_after = [event for event in emitted if event[0] == "room:user_joined"]
    assert len(joined_events_after) == emitted_count


@pytest.mark.asyncio
async def test_model_to_schema_accepts_string_enums(
    app: FastAPI,
    sessionmaker: async_sessionmaker[AsyncSession],
    user_factory,
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)

    async with sessionmaker() as session:
        service = RoomService(session, app.state.redis)
        initiator = await session.get(User, alice.id)
        invitee = await session.get(User, bob.id)
        assert initiator is not None
        assert invitee is not None

        room = await service.create_room(initiator, invitee)
        room, _ = await service.join_room(room.id, invitee)

        stringified_room = SimpleNamespace(
            id=room.id,
            status=room.status.value,
            initiator_id=room.initiator_id,
            created_at=room.created_at,
            updated_at=room.updated_at,
            closed_at=room.closed_at,
            participants=[
                SimpleNamespace(
                    user_id=participant.user_id,
                    role=participant.role.value,
                    joined_at=participant.joined_at,
                    left_at=participant.left_at,
                )
                for participant in room.participants
            ],
        )

    schema = _model_to_schema(stringified_room)  # type: ignore[arg-type]

    assert schema.status == RoomStatusSchema.ACTIVE
    roles = {participant.role for participant in schema.participants}
    assert roles == {RoomParticipantRoleSchema.INITIATOR, RoomParticipantRoleSchema.GUEST}


@pytest.mark.asyncio
async def test_list_rooms_requires_admin(
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)

    await _login(client, "alice")
    await client.post("/rooms", json={"targetUserId": str(bob.id)})

    response = await client.get("/rooms")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_rooms_returns_active_rooms_for_admin(
    client: AsyncClient,
    app: FastAPI,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    admin = await user_factory("admin", "admin@example.com", "Password123!", is_admin=True)
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")
    carol = await user_factory("carol", "carol@example.com", "Password123!")
    dave = await user_factory("dave", "dave@example.com", "Password123!")

    await _create_friendship(sessionmaker, alice.id, bob.id)
    await _create_friendship(sessionmaker, carol.id, dave.id)

    await _login(client, "alice")
    waiting_response = await client.post("/rooms", json={"targetUserId": str(bob.id)})
    assert waiting_response.status_code == 201

    await _login(client, "carol")
    active_response = await client.post("/rooms", json={"targetUserId": str(dave.id)})
    assert active_response.status_code == 201
    active_room_id = active_response.json()["room"]["id"]

    async with sessionmaker() as session:
        service = RoomService(session, app.state.redis)
        room_uuid = uuid.UUID(active_room_id)
        dave_model = await session.get(User, dave.id)
        assert dave_model is not None
        await service.join_room(room_uuid, dave_model)

    await _login(client, "admin")
    response = await client.get("/rooms")
    assert response.status_code == 200

    payload = response.json()["rooms"]
    statuses = {room["status"] for room in payload}
    assert statuses == {"waiting", "active"}
    returned_ids = {room["id"] for room in payload}
    assert active_room_id in returned_ids
