from __future__ import annotations

import json
from dataclasses import dataclass, field as dataclass_field
from typing import Any, Mapping
from urllib.parse import urlencode, urlsplit



@dataclass
# Внутренний класс для хранения "сырого" состояния HTTP-ответа (статус, заголовки, тело).
class _ResponseState:
    """
    Этот класс действует как простая "корзина" для сбора данных ответа от приложения.
    Он используется в методе _request для накопления информации по частям: сначала статус и заголовки (из "http.response.start"),
    потом тело ответа (из "http.response.body").
    Поля инициализируются дефолтными значениями: status и headers могут быть None на старте,
    body — пустой bytearray (расширяемый массив байтов, удобный для добавления данных по кускам без копирования).

    Зачем нужен: Чтобы симулировать сбор ответа в тест-клиенте без реальной сети.
    Bytearray выбран для body, потому что он mutable (изменяемый) и позволяет эффективно добавлять байты (метод extend),
    что полезно для потоковых ответов или больших данных.
    В конце state передаётся в Response для создания финального объекта ответа.
    """
    status: int | None = None
    headers: list[tuple[bytes, bytes]] | None = None
    body: bytearray = dataclass_field(default_factory=bytearray)


# Класс для хранения и доступа cookies в виде словаря
class Cookies:
    """
    Этот класс — простая "обёртка" вокруг словаря куки (пар имя-значение, типа {'session': 'abc123'}).
    Он позволяет удобно получать куки по ключу (get или []), итерацию (items) без изменения оригинала.

    Зачем нужен: В Response это response.cookies — позволяет тесту проверять, какие куки установлены (assert 'session' in response.cookies).
    Items возвращает копию, чтобы избежать случайных изменений.
    Класс immutable в смысле, что не меняет данные внутри, но предоставляет доступ как к словарю.
    """
    def __init__(self, data: Mapping[str, str] | None = None) -> None:
        self._data: dict[str, str] = dict(data or {})

    # Метод для получения значения куки по ключу с дефолтом.
    def get(self, key: str, default: str | None = None) -> str | None:
        return self._data.get(key, default)

    # "Магический" метод для доступа как cookies[key] — возвращает значение, ошибка если key нет.
    def __getitem__(self, key: str) -> str:
        return self._data[key]

    # Возвращает копию словаря для итерации (чтобы не модифицировать оригинал).
    def items(self) -> Mapping[str, str]:
        return self._data.copy()


# Внутренний класс для управления куки: хранение, добавление в заголовки и извлечение из ответов.
class _CookieJar:
    """
    Это "банка" для куки (_cookies — dict[str,str]).
    Apply_to_headers добавляет все куки в запрос как заголовок "Cookie: name=value; other=val" (в байтах).
    Extract_from_headers ищет в ответе "Set-Cookie", разбирает (decode из байтов в текст, split на части),
    сохраняет/удаляет в _cookies (если value пустое — pop, т.е. удалить).
    Возвращает Cookies — копию для Response.

    Зачем нужен: Имитирует браузер — куки сохраняются между запросами (сессии, авторизация).
    Apply — для отправки старых куки в запрос, extract — для получения новых из ответа.
    Latin1 — кодировка для байтов/текста без ошибок. Split — для разбора (убирает атрибуты типа "; Path=/",
    берёт только "key=value").
    Это замыкает цикл куки: запрос с куки → app видит → ответ с новыми → сохранение.
    """
    def __init__(self) -> None:
        self._cookies: dict[str, str] = {}

    # Метод для добавления куки в заголовки.
    def apply_to_headers(self, headers: list[tuple[bytes, bytes]]) -> None:
        if not self._cookies:
            return
        cookie_value = "; ".join(f"{name}={value}" for name, value in self._cookies.items())
        headers.append((b"cookie", cookie_value.encode("latin1")))

    # Метод для извлечения куки из ответов.
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


# Класс для представления HTTP-ответа: статус, заголовки, тело, куки.
class Response:
    """
    Это "готовая посылка" от приложения: берёт _ResponseState (сырые данные) и Cookies,
    преобразует в удобный вид (status_code — int, headers — dict[str,str] с lowercase/decode,
    _body — bytes из bytearray, cookies — объект Cookies).
    Методы: json — парсит тело как JSON (loads из байтов, utf-8), text — просто текст из байтов.

    Зачем нужен: Для тестов — response.status_code, response.json(), response.text, response.cookies.
    Raise если state не инициализирован — чтобы поймать ошибки.
    Decode/l님ower — headers из байтов в текст, lowercase для стандарта (HTTP не чувствителен к регистру).
    Это финальный объект, который тест получает от _request.
    """
    def __init__(self, state: _ResponseState, cookies: Cookies) -> None:
        # Если не заполнено — ошибка.
        if state.status is None or state.headers is None:
            raise RuntimeError("Response not initialized")
        self.status_code: int = state.status
        self._headers = state.headers
        self.headers: dict[str, str] = {
            name.decode("latin1").lower(): value.decode("latin1") for name, value in state.headers
        }
        self._body = bytes(state.body)
        self.cookies = cookies

    # Метод для парсинга тела как JSON.
    def json(self) -> Any:
        if not self._body:
            raise ValueError("No JSON body")
        return json.loads(self._body.decode("utf-8"))

    # Свойство (не метод): возвращает тело как текст.
    @property
    def text(self) -> str:
        return self._body.decode("utf-8")


# Асинхронный клиент для симуляции HTTP-запросов к приложению.
class AsyncClient:
    """
    Это главный "заказчик": держит app (приложение), base_url (базовый адрес, как "http://testserver"),
    _jar (_CookieJar для куки). Методы get/post/delete — удобные "кнопки" для запросов,
    зовут _request (общий метод симуляции). _request готовит target (URL), headers (с куки из _jar),
    state, receive (дай body), send (собери ответ), scope (форма заказа), зовёт app, extract куки в _jar, return Response.

    __aenter__/__aexit__ — для async with (удобно в тестах).
    Зачем нужен: Для тестов без сервера — симулирует браузер, сохраняет куки между запросами.
    Асинхронный, чтобы работать с async app (FastAPI). Scope — ключ: собирает запрос в "форму" для ASGI.
    """
    def __init__(self, app: Any, base_url: str = "http://testserver") -> None:
        self._app = app
        self._base_url = base_url
        self._jar = _CookieJar()

    # Для использования в async with: возвращает себя.
    async def __aenter__(self) -> "AsyncClient":
        return self

    # Завершение async with: ничего не делает (пустая реализация).
    async def __aexit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        return None

    # Асинхронный метод для GET-запроса.
    async def get(
        self,
        url: str,
        *,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Response:
        # GET: зовёт внутренний _request без body.
        return await self._request("GET", url, params=params, headers=headers)

    # Асинхронный метод для POST-запроса.
    async def post(
        self,
        url: str,
        *,
        json: Any | None = None,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Response:
        # POST: готовит body из json (json_dumps), добавляет content-type, зовёт _request.
        body_bytes: bytes | None = None
        request_headers = dict(headers or {})
        if json is not None:
            body_bytes = json_dumps(json)
            request_headers.setdefault("content-type", "application/json")
        return await self._request("POST", url, body=body_bytes, params=params, headers=request_headers)

    # Асинхронный метод для DELETE-запроса.
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
        """
        Внутренний асинхронный метод для выполнения запроса (общий для GET/POST/DELETE).
        Общий метод:
            готовит target, headers с куки, state, receive/send, scope, зовёт app, extract куки, return Response.
        """
        target = self._prepare_target(url, params=params)       # Подготовка URL и заголовков.
        header_items: list[tuple[bytes, bytes]] = []            # Список заголовков в байтах.
        if headers:
            for name, value in headers.items():
                header_items.append((name.lower().encode("latin1"), str(value).encode("latin1")))
        self._jar.apply_to_headers(header_items)

        # Создаем пустой объект состояния для ответа.
        state = _ResponseState()

        # Функция для "получения" тела запроса от клиента (симуляция).
        async def receive() -> dict[str, Any]:
            nonlocal body
            if body is not None:
                chunk = body
                body = None
                return {"type": "http.request", "body": chunk, "more_body": False}
            return {"type": "http.request", "body": b"", "more_body": False}

        # Функция для "отправки" ответа от приложения (собираем состояние).
        async def send(message: dict[str, Any]) -> None:
            # Проверка ключа "type" в message, проверка начала отправки ответа приложения.
            if message["type"] == "http.response.start":
                state.status = message["status"]
                state.headers = message.get("headers", [])
            # Проверка ключа "type" в message, проверка отправки тела ответа приложения.
            elif message["type"] == "http.response.body":
                state.body.extend(message.get("body", b""))

        # Создание scope (описание запроса для ASGI)
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

        # Вызываем приложение с scope, receive и send (симулируем запрос).
        await self._app(scope, receive, send)

        # Извлекаем куки из заголовков ответа.
        cookies = self._jar.extract_from_headers(state.headers or [])

        # Возвращаем Response - ответ.
        return Response(state, cookies)

    # Подготавливает цель запроса (URL-парсинг).
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

        # Возвращаем dict для scope (query в байтах).
        return {"scheme": scheme, "path": path, "query": query_string.encode("latin1")}


# Простая функция для сериализации (упаковки) объекта в JSON-байты.
def json_dumps(payload: Any) -> bytes:
    return json.dumps(payload).encode("utf-8")


__all__ = ["AsyncClient", "Response", "Cookies"]
