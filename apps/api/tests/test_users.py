from datetime import datetime

import pytest
from httpx import AsyncClient


async def _login(client: AsyncClient, identifier: str, password: str = "Password123!") -> None:
    response = await client.post(
        "/auth/login", json={"identifier": identifier, "password": password}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_search_users_returns_matches(client, user_factory) -> None:
    alex = await user_factory("alex", "alex@example.com", "Password123!")
    await user_factory("runkov", "runkov@example.com", "Password123!")
    await user_factory("runkeeper", "runner@example.com", "Password123!")
    await user_factory("other", "other@example.com", "Password123!")

    await _login(client, "alex")

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

    await _login(client, "short")

    response = await client.get("/users/search", params={"q": " ", "limit": 5})
    assert response.status_code == 400
    assert response.json()["detail"] == "Query must be at least 2 characters"


@pytest.mark.asyncio
async def test_get_preferences_returns_defaults(client, user_factory) -> None:
    await user_factory("pref", "pref@example.com", "Password123!")

    await _login(client, "pref")

    response = await client.get("/users/preferences")
    assert response.status_code == 200
    payload = response.json()

    assert payload["theme"]["mode"] == "system"
    assert payload["sidebar"]["collapsed"] is False
    assert payload["audio"]["muteMicrophoneOnJoin"] is False
    assert payload["video"]["startWithCamera"] is True
    assert payload["notifications"]["playSounds"] is True
    assert payload["updatedAt"]


@pytest.mark.asyncio
async def test_update_preferences_merges_nested(client, user_factory) -> None:
    await user_factory("pref2", "pref2@example.com", "Password123!")

    await _login(client, "pref2")

    initial = await client.get("/users/preferences")
    assert initial.status_code == 200
    initial_payload = initial.json()

    update_response = await client.put(
        "/users/preferences",
        json={
            "updatedAt": initial_payload["updatedAt"],
            "theme": {"mode": "dark"},
            "audio": {"muteMicrophoneOnJoin": True},
        },
    )
    assert update_response.status_code == 200
    updated_payload = update_response.json()

    assert updated_payload["theme"]["mode"] == "dark"
    assert updated_payload["audio"]["muteMicrophoneOnJoin"] is True
    assert updated_payload["video"]["startWithCamera"] is True
    assert updated_payload["notifications"]["showToasts"] is True

    updated_at = datetime.fromisoformat(updated_payload["updatedAt"])
    original_at = datetime.fromisoformat(initial_payload["updatedAt"])
    assert updated_at >= original_at
