from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field as dataclass_field
from typing import Any, Mapping
from urllib.parse import urlencode, urlsplit


@dataclass
class _ResponseState:
    status: int | None = None
    headers: list[tuple[bytes, bytes]] | None = None
    body: bytearray = dataclass_field(default_factory=bytearray)


class Cookies:
    def __init__(self, data: Mapping[str, str] | None = None) -> None:
        self._data: dict[str, str] = dict(data or {})

    def get(self, key: str, default: str | None = None) -> str | None:
        return self._data.get(key, default)

    def __getitem__(self, key: str) -> str:
        return self._data[key]

    def items(self) -> Mapping[str, str]:
        return self._data.copy()


class _CookieJar:
    def __init__(self) -> None:
        self._cookies: dict[str, str] = {}

    def apply_to_headers(self, headers: list[tuple[bytes, bytes]]) -> None:
        if not self._cookies:
            return
        cookie_value = "; ".join(f"{name}={value}" for name, value in self._cookies.items())
        headers.append((b"cookie", cookie_value.encode("latin1")))

    def extract_from_headers(self, headers: list[tuple[bytes, bytes]]) -> Cookies:
        for name, value in headers:
            if name.lower() == b"set-cookie":
                cookie_parts = value.decode("latin1").split(";", 1)[0]
                if "=" in cookie_parts:
                    key, cookie_value = cookie_parts.split("=", 1)
                    if cookie_value == "":
                        self._cookies.pop(key, None)
                    else:
                        self._cookies[key] = cookie_value
        return Cookies(self._cookies)


class Response:
    def __init__(self, state: _ResponseState, cookies: Cookies) -> None:
        if state.status is None or state.headers is None:
            raise RuntimeError("Response not initialized")
        self.status_code: int = state.status
        self._headers = state.headers
        self.headers: dict[str, str] = {
            name.decode("latin1").lower(): value.decode("latin1") for name, value in state.headers
        }
        self._body = bytes(state.body)
        self.cookies = cookies

    def json(self) -> Any:
        if not self._body:
            raise ValueError("No JSON body")
        return json.loads(self._body.decode("utf-8"))

    @property
    def text(self) -> str:
        return self._body.decode("utf-8")


class AsyncClient:
    def __init__(self, app: Any, base_url: str = "http://testserver") -> None:
        self._app = app
        self._base_url = base_url
        self._jar = _CookieJar()

    async def __aenter__(self) -> "AsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        return None

    async def get(
        self,
        url: str,
        *,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Response:
        return await self._request("GET", url, params=params, headers=headers)

    async def post(
        self,
        url: str,
        *,
        json: Any | None = None,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Response:
        body_bytes: bytes | None = None
        request_headers = dict(headers or {})
        if json is not None:
            body_bytes = json_dumps(json)
            request_headers.setdefault("content-type", "application/json")
        return await self._request("POST", url, body=body_bytes, params=params, headers=request_headers)

    async def delete(
        self,
        url: str,
        *,
        json: Any | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Response:
        body_bytes = json_dumps(json) if json is not None else None
        request_headers = dict(headers or {})
        if body_bytes is not None:
            request_headers.setdefault("content-type", "application/json")
        return await self._request("DELETE", url, body=body_bytes, headers=request_headers)

    async def _request(
        self,
        method: str,
        url: str,
        *,
        body: bytes | None = None,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Response:
        target = self._prepare_target(url, params=params)
        header_items: list[tuple[bytes, bytes]] = []
        if headers:
            for name, value in headers.items():
                header_items.append((name.lower().encode("latin1"), str(value).encode("latin1")))
        self._jar.apply_to_headers(header_items)

        state = _ResponseState()

        async def receive() -> dict[str, Any]:
            nonlocal body
            if body is not None:
                chunk = body
                body = None
                return {"type": "http.request", "body": chunk, "more_body": False}
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                state.status = message["status"]
                state.headers = message.get("headers", [])
            elif message["type"] == "http.response.body":
                state.body.extend(message.get("body", b""))

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": method,
            "scheme": target["scheme"],
            "path": target["path"],
            "raw_path": target["path"].encode("latin1"),
            "query_string": target["query"],
            "headers": header_items,
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
        }

        await self._app(scope, receive, send)
        cookies = self._jar.extract_from_headers(state.headers or [])
        return Response(state, cookies)

    def _prepare_target(self, url: str, params: Mapping[str, Any] | None) -> dict[str, Any]:
        if url.startswith("http://") or url.startswith("https://"):
            parsed = urlsplit(url)
            path = parsed.path or "/"
            query_string = parsed.query
            scheme = parsed.scheme
        else:
            parsed = urlsplit(self._base_url + url)
            path = parsed.path or "/"
            query_string = parsed.query
            scheme = parsed.scheme or "http"

        if params:
            qs = urlencode(params, doseq=True)
            query_string = "&".join(filter(None, [query_string, qs]))
        return {"scheme": scheme, "path": path, "query": query_string.encode("latin1")}


def json_dumps(payload: Any) -> bytes:
    return json.dumps(payload).encode("utf-8")


__all__ = ["AsyncClient", "Response", "Cookies"]
