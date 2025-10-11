from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _login(client: AsyncClient, identifier: str, password: str = "Password123!") -> None:
    response = await client.post("/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_friend_request_creates_pending_and_emits_event(client: AsyncClient, user_factory, monkeypatch) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _login(client, "alice")

    captured: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        captured.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.friends.sio.emit", fake_emit)

    response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    assert response.status_code == 202
    payload = response.json()

    assert payload["status"] == "pending"
    assert payload["requester"]["username"] == "alice"
    assert payload["addressee"]["username"] == "bob"

    assert captured, "expected socket emit"
    event, event_payload, room = captured[0]
    assert event == "friends:request"
    assert room == f"user:{bob.id}"
    assert event_payload["friend"]["status"] == "pending"
    assert "reason" in event_payload


@pytest.mark.asyncio
async def test_list_friends_supports_filters(client: AsyncClient, user_factory, monkeypatch) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")
    carol = await user_factory("carol", "carol@example.com", "Password123!")

    await _login(client, "alice")
    response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    assert response.status_code == 202
    bob_request_id = response.json()["id"]

    await _login(client, "bob")
    accept_response = await client.post("/friends/accept", json={"requestId": bob_request_id})
    assert accept_response.status_code == 200
    assert accept_response.json()["status"] == "accepted"

    await _login(client, "alice")
    pending_response = await client.post("/friends/request", json={"targetUserId": str(carol.id)})
    assert pending_response.status_code == 202

    list_response = await client.get("/friends")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    statuses = {item["status"] for item in items}
    assert statuses == {"accepted", "pending"}

    pending_only = await client.get("/friends", params={"status": "pending"})
    assert pending_only.status_code == 200
    pending_items = pending_only.json()["items"]
    assert len(pending_items) == 1
    assert pending_items[0]["addresseeId"] == str(carol.id)


@pytest.mark.asyncio
async def test_decline_friend_updates_status_and_notifies(client: AsyncClient, user_factory, monkeypatch) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _login(client, "alice")
    response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    assert response.status_code == 202
    request_id = response.json()["id"]

    await _login(client, "bob")

    captured: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        captured.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.friends.sio.emit", fake_emit)

    decline_response = await client.post("/friends/decline", json={"requestId": request_id})
    assert decline_response.status_code == 200
    data = decline_response.json()
    assert data["status"] == "declined"
    assert data["respondedAt"] is not None

    assert captured, "expected decline notification"
    event, payload, room = captured[0]
    assert event == "friends:declined"
    assert room == f"user:{alice.id}"
    assert payload["friend"]["status"] == "declined"
    assert "reason" in payload


@pytest.mark.asyncio
async def test_request_friend_returns_existing_incoming_pending(
    client: AsyncClient,
    user_factory,
    monkeypatch,
) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _login(client, "alice")
    first_response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    assert first_response.status_code == 202
    original_id = first_response.json()["id"]

    await _login(client, "bob")

    emitted: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        emitted.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.friends.sio.emit", fake_emit)

    second_response = await client.post("/friends/request", json={"targetUserId": str(alice.id)})
    assert second_response.status_code == 202

    data = second_response.json()
    assert data["id"] == original_id
    assert data["status"] == "pending"
    assert data["requester"]["username"] == "alice"
    assert data["addressee"]["username"] == "bob"

    assert emitted == []


@pytest.mark.asyncio
async def test_accept_friend_requires_pending_state(client: AsyncClient, user_factory) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _login(client, "alice")
    response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    request_id = response.json()["id"]

    await _login(client, "bob")
    accept_response = await client.post("/friends/accept", json={"requestId": request_id})
    assert accept_response.status_code == 200

    second_accept = await client.post("/friends/accept", json={"requestId": request_id})
    assert second_accept.status_code == 409
    assert second_accept.json()["detail"] == "Request is not pending"

    decline_after_accept = await client.post("/friends/decline", json={"requestId": request_id})
    assert decline_after_accept.status_code == 409
    assert decline_after_accept.json()["detail"] == "Request is not pending"


@pytest.mark.asyncio
async def test_accept_friend_emits_serializable_payload(client: AsyncClient, user_factory, monkeypatch) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _login(client, "alice")
    response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    assert response.status_code == 202
    request_id = response.json()["id"]

    await _login(client, "bob")

    captured: list[tuple[str, dict, str | None]] = []

    async def fake_emit(event: str, payload: dict, room: str | None = None, **_: object) -> None:
        captured.append((event, payload, room))

    monkeypatch.setattr("videochat_api.api.endpoints.friends.sio.emit", fake_emit)

    accept_response = await client.post("/friends/accept", json={"requestId": request_id})
    assert accept_response.status_code == 200

    assert captured, "expected accept notification"
    rooms = {room for _, _, room in captured}
    assert rooms == {f"user:{alice.id}", f"user:{bob.id}"}

    for event, payload, room in captured:
        assert event == "friends:accepted"
        assert payload["friend"]["status"] == "accepted"
        assert isinstance(payload["friend"]["createdAt"], str)
        assert isinstance(payload["friend"]["respondedAt"], str)
