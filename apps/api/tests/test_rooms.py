import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from videochat_api.models import FriendRelationship, FriendStatus as FriendModelStatus, User
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
