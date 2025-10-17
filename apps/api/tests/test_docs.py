from __future__ import annotations

import pytest


@pytest.mark.anyio
async def test_docs_available(client) -> None:
    response = await client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text


@pytest.mark.anyio
async def test_openapi_available(client) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("openapi"), str)
