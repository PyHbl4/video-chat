from __future__ import annotations

import pytest

from videochat_api.config import settings


@pytest.mark.asyncio
async def test_web_login_cookie_flow(
    client,
    user_factory,
    csrf_header,
    session_cookie_name,
) -> None:
    await user_factory("webuser", "web@example.com", "Password123!")

    response = await client.post(
        "/auth/login",
        json={"identifier": "webuser", "password": "Password123!"},
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["csrf_token"]
    assert payload["session_expires_in"] == settings.session_max_age_seconds

    cookie_value = response.cookies.get(session_cookie_name)
    assert cookie_value

    me_response = await client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["username"] == "webuser"

    logout_response = await client.post(
        "/auth/logout",
        headers={csrf_header: payload["csrf_token"]},
    )
    assert logout_response.status_code == 204

    me_after_logout = await client.get("/auth/me")
    assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotation_and_logout(client, user_factory) -> None:
    await user_factory("desktop", "desktop@example.com", "Password123!")

    login_response = await client.post(
        "/auth/login",
        json={
            "identifier": "desktop",
            "password": "Password123!",
            "device": {
                "kind": "desktop",
                "identifier": "device-123",
                "display_name": "Workstation",
            },
        },
    )
    assert login_response.status_code == 200
    tokens = login_response.json()

    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["device_id"]
    assert tokens["token_type"] == "bearer"

    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    device_id = tokens["device_id"]

    me_response = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["username"] == "desktop"

    refresh_payload = {"refresh_token": refresh_token, "device_id": device_id}
    refresh_response = await client.post("/auth/refresh", json=refresh_payload)
    assert refresh_response.status_code == 200
    refreshed = refresh_response.json()
    assert refreshed["refresh_token"] != refresh_token

    reuse_response = await client.post("/auth/refresh", json=refresh_payload)
    assert reuse_response.status_code == 401

    new_access = refreshed["access_token"]
    new_refresh = refreshed["refresh_token"]

    me_with_new_access = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert me_with_new_access.status_code == 200

    logout_response = await client.post(
        "/auth/logout",
        json={"refresh_token": new_refresh, "device_id": refreshed["device_id"]},
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert logout_response.status_code == 204

    me_after_logout = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert me_after_logout.status_code == 401

    refresh_after_logout = await client.post(
        "/auth/refresh",
        json={"refresh_token": new_refresh, "device_id": refreshed["device_id"]},
    )
    assert refresh_after_logout.status_code == 401
