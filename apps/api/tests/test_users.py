import pytest


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
