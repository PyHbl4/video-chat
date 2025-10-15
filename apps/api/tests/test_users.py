import pytest


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
