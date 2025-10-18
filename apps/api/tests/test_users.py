import pytest

from sqlalchemy import select

from videochat_api.models import FriendRelationship, User


async def _login(client, identifier: str, password: str = "Password123!", **extra: object) -> None:
    response = await client.post("/auth/login", json={"identifier": identifier, "password": password, **extra})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_search_users_returns_matches(client, user_factory) -> None:
    alex = await user_factory("alex", "alex@example.com", "Password123!")
    await user_factory("runkov", "runkov@example.com", "Password123!")
    await user_factory("runkeeper", "runner@example.com", "Password123!")
    await user_factory("other", "other@example.com", "Password123!")

    login_response = await client.post(
        "/auth/login",
        json={"identifier": "alex", "password": "Password123!"},
    )
    assert login_response.status_code == 200

    response = await client.get("/users/search", params={"q": "run", "limit": 5})
    assert response.status_code == 200
    payload = response.json()

    usernames = [item["username"] for item in payload["items"]]
    assert usernames == ["runkeeper", "runkov"]
    assert all(item["id"] != str(alex.id) for item in payload["items"])
    for item in payload["items"]:
        assert item["displayName"] == item["username"]
        assert item["createdAt"]


@pytest.mark.asyncio
async def test_search_users_validates_query_length(client, user_factory) -> None:
    await user_factory("short", "short@example.com", "Password123!")

    login_response = await client.post(
        "/auth/login",
        json={"identifier": "short", "password": "Password123!"},
    )
    assert login_response.status_code == 200

    response = await client.get("/users/search", params={"q": " ", "limit": 5})
    assert response.status_code == 400
    assert response.json()["detail"] == "Query must be at least 2 characters"


@pytest.mark.asyncio
async def test_list_users_requires_admin(client, user_factory) -> None:
    await user_factory("regular", "regular@example.com", "Password123!")
    await _login(client, "regular")

    response = await client.get("/users")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users_with_includes(client, user_factory) -> None:
    admin = await user_factory("admin", "admin@example.com", "Password123!", is_admin=True)
    target = await user_factory("target", "target@example.com", "Password123!")

    await _login(
        client,
        "target",
        device={
            "identifier": "device-1",
            "kind": "desktop",
            "displayName": "Workstation",
        },
    )

    await _login(client, "admin")

    response = await client.get(
        "/users",
        params=[("include", "devices"), ("include", "sessions")],
    )
    assert response.status_code == 200

    payload = response.json()["users"]
    users_by_id = {item["id"]: item for item in payload}
    assert str(target.id) in users_by_id

    target_payload = users_by_id[str(target.id)]
    assert target_payload["devices"]
    assert target_payload["devices"][0]["identifier"] == "device-1"
    assert target_payload["sessions"]
    session = target_payload["sessions"][0]
    assert session["kind"] == "desktop"
    assert session["deviceId"] is not None


@pytest.mark.asyncio
async def test_delete_user_by_owner(client, user_factory, sessionmaker) -> None:
    user = await user_factory("self", "self@example.com", "Password123!")

    await _login(client, "self")

    response = await client.delete(f"/users/{user.id}")
    assert response.status_code == 204

    me_response = await client.get("/auth/me")
    assert me_response.status_code == 401

    async with sessionmaker() as session:
        removed_user = await session.get(User, user.id)
        assert removed_user is None


@pytest.mark.asyncio
async def test_delete_user_by_admin(client, user_factory, sessionmaker) -> None:
    await user_factory("admin", "admin@example.com", "Password123!", is_admin=True)
    target = await user_factory("target-delete", "target-delete@example.com", "Password123!")

    await _login(client, "admin")

    response = await client.delete(f"/users/{target.id}")
    assert response.status_code == 204

    async with sessionmaker() as session:
        removed_user = await session.get(User, target.id)
        assert removed_user is None


@pytest.mark.asyncio
async def test_delete_user_forbidden_for_other_user(client, user_factory, sessionmaker) -> None:
    user = await user_factory("owner", "owner@example.com", "Password123!")
    target = await user_factory("foreign", "foreign@example.com", "Password123!")

    await _login(client, "owner")

    response = await client.delete(f"/users/{target.id}")
    assert response.status_code == 403

    async with sessionmaker() as session:
        existing_user = await session.get(User, target.id)
        assert existing_user is not None


@pytest.mark.asyncio
async def test_delete_user_not_found(client, user_factory) -> None:
    await user_factory("admin2", "admin2@example.com", "Password123!", is_admin=True)

    await _login(client, "admin2")

    response = await client.delete("/users/9999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_user_invalid_identifier(client, user_factory) -> None:
    await user_factory("admin3", "admin3@example.com", "Password123!", is_admin=True)

    await _login(client, "admin3")

    response = await client.delete("/users/invalid")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_user_with_friendships(client, user_factory, sessionmaker) -> None:
    alice = await user_factory("alice", "alice@example.com", "Password123!")
    bob = await user_factory("bob", "bob@example.com", "Password123!")

    await _login(client, "alice")
    request_response = await client.post("/friends/request", json={"targetUserId": str(bob.id)})
    assert request_response.status_code == 202
    request_id = request_response.json()["id"]

    await _login(client, "bob")
    accept_response = await client.post("/friends/accept", json={"requestId": request_id})
    assert accept_response.status_code == 200

    delete_response = await client.delete(f"/users/{bob.id}")
    assert delete_response.status_code == 204

    async with sessionmaker() as session:
        assert await session.get(User, bob.id) is None

        remaining_friendships = (
            await session.execute(
                select(FriendRelationship).where(
                    (FriendRelationship.requester_id == alice.id)
                    | (FriendRelationship.addressee_id == alice.id)
                    | (FriendRelationship.requester_id == bob.id)
                    | (FriendRelationship.addressee_id == bob.id)
                )
            )
        ).scalars().all()

        assert remaining_friendships == []