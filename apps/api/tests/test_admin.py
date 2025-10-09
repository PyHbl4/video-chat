from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from videochat_api.dependencies import CurrentUserWithRoles, get_current_user_with_roles
from videochat_api.models import (
    ModerationAction,
    ModerationEvent,
    RoleName,
    User,
    UserRole,
)


@pytest.mark.asyncio
async def test_list_users_requires_role(
    app,
    client: AsyncClient,
    user_factory,
) -> None:
    admin_user: User = await user_factory("admin", "admin@example.com", "Password123!", roles=[RoleName.ADMIN])

    async def override() -> CurrentUserWithRoles:
        return CurrentUserWithRoles(user=admin_user, roles=set(), is_superuser=False)

    app.dependency_overrides[get_current_user_with_roles] = override
    try:
        response = await client.get("/admin/users")
    finally:
        app.dependency_overrides.pop(get_current_user_with_roles, None)

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users_returns_paginated_result(
    app,
    client: AsyncClient,
    user_factory,
) -> None:
    admin_user: User = await user_factory("admin", "admin2@example.com", "Password123!", roles=[RoleName.ADMIN])
    await user_factory("alice", "alice@example.com", "Password123!", roles=[RoleName.MODERATOR])
    await user_factory("bob", "bob@example.com", "Password123!", is_blocked=True)

    async def override() -> CurrentUserWithRoles:
        return CurrentUserWithRoles(
            user=admin_user,
            roles={RoleName.ADMIN},
            is_superuser=False,
        )

    app.dependency_overrides[get_current_user_with_roles] = override
    try:
        response = await client.get(
            "/admin/users",
            params={
                "page": 1,
                "page_size": 10,
                "sort_by": "username",
                "sort_order": "asc",
            },
        )
    finally:
        app.dependency_overrides.pop(get_current_user_with_roles, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 3
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    usernames = [item["username"] for item in payload["items"]]
    assert usernames == ["admin", "alice", "bob"]
    alice_entry = next(item for item in payload["items"] if item["username"] == "alice")
    assert set(alice_entry["roles"]) == {RoleName.USER.value, RoleName.MODERATOR.value}


@pytest.mark.asyncio
async def test_admin_block_unblock_and_roles(
    app,
    client: AsyncClient,
    user_factory,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    admin_user: User = await user_factory("root", "root@example.com", "Password123!", roles=[RoleName.ADMIN])
    target: User = await user_factory("charlie", "charlie@example.com", "Password123!")

    async def override() -> CurrentUserWithRoles:
        return CurrentUserWithRoles(
            user=admin_user,
            roles={RoleName.ADMIN},
            is_superuser=False,
        )

    app.dependency_overrides[get_current_user_with_roles] = override

    try:
        block_response = await client.post(
            f"/admin/users/{target.id}/block",
            json={"reason": "spam"},
        )
        assert block_response.status_code == 200
        blocked = block_response.json()
        assert blocked["is_blocked"] is True
        assert set(blocked["roles"]) == {RoleName.USER.value}

        roles_response = await client.post(
            f"/admin/users/{target.id}/roles",
            json={"roles": [RoleName.MODERATOR.value], "mode": "add"},
        )
        assert roles_response.status_code == 200
        with_roles = roles_response.json()
        assert set(with_roles["roles"]) == {RoleName.USER.value, RoleName.MODERATOR.value}

        unblock_response = await client.post(
            f"/admin/users/{target.id}/unblock",
            json={"reason": "appeal"},
        )
        assert unblock_response.status_code == 200
        unblocked = unblock_response.json()
        assert unblocked["is_blocked"] is False
    finally:
        app.dependency_overrides.pop(get_current_user_with_roles, None)

    async with sessionmaker() as session:
        events = await session.execute(
            select(ModerationEvent.action).where(ModerationEvent.target_user_id == target.id)
        )
        actions = [row[0] for row in events]
        assert actions.count(ModerationAction.BLOCK) == 1
        assert actions.count(ModerationAction.UNBLOCK) == 1
        assert actions.count(ModerationAction.ROLE_GRANT) == 1

        role_rows = await session.execute(
            select(UserRole.role).where(UserRole.user_id == target.id)
        )
        final_roles = {row[0] for row in role_rows}
        assert final_roles == {RoleName.USER, RoleName.MODERATOR}
