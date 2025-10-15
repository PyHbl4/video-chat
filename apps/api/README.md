# Video Chat API

## Overview
The Video Chat API is an asynchronous FastAPI service that powers authentication, user discovery, friend management, and presence for the self-hosted video chat platform. The application exposes REST endpoints for core account flows and real-time updates via a Socket.IO gateway layered on top of FastAPI. Redis backs rate limiting and presence tracking, while PostgreSQL stores relational data accessed through SQLAlchemy models.

## Features
- **Unified FastAPI application** with shared lifespan management that wires database engines, Redis connections, and Socket.IO on startup. 【F:apps/api/videochat_api/main.py†L17-L52】
- **Configurable environment settings** using `pydantic-settings`, including database, Redis, session, and JWT options. 【F:apps/api/videochat_api/config.py†L6-L44】
- **Password-based registration and login** supporting browser cookies and long-lived device tokens, backed by Argon2 hashing, JWT access tokens, and refresh rotation. 【F:apps/api/videochat_api/api/endpoints/auth.py†L31-L187】【F:apps/api/videochat_api/auth/session.py†L36-L210】
- **Friend relationship workflow** with REST actions (request, accept, decline) and socket notifications to both participants. 【F:apps/api/videochat_api/api/endpoints/friends.py†L19-L205】
- **User discovery** via authenticated search filtering blocked accounts and enforcing minimum query length. 【F:apps/api/videochat_api/api/endpoints/users.py†L12-L56】
- **Presence broadcasting** that stores online state in Redis, keeps TTL refreshed, and multicasts updates to friends over Socket.IO. 【F:apps/api/videochat_api/services/presence.py†L1-L94】【F:apps/api/videochat_api/websocket/server.py†L1-L210】
- **Login rate limiting** implemented with Redis and a permissive fallback when Redis is unavailable. 【F:apps/api/videochat_api/services/rate_limiter.py†L1-L52】【F:apps/api/videochat_api/dependencies.py†L21-L44】
- **Two-party video rooms** with persistent records, Redis-backed caching, REST management, and dedicated Socket.IO namespace for signaling. 【F:apps/api/videochat_api/models/room.py†L1-L82】【F:apps/api/videochat_api/services/rooms.py†L1-L220】【F:apps/api/videochat_api/api/endpoints/rooms.py†L1-L164】【F:apps/api/videochat_api/websocket/server.py†L1-L360】

## Project Structure
```
apps/api/
├── alembic/                     # Database migrations (PostgreSQL)
├── tests/                       # Pytest suite for REST flows
├── videochat_api/
│   ├── api/                     # FastAPI routers and endpoint modules
│   ├── auth/                    # Session + password utilities
│   ├── db/                      # SQLAlchemy engine/session helpers
│   ├── models/                  # ORM models for users, devices, sessions, friends
│   ├── schemas/                 # Pydantic request/response models
│   ├── services/                # Domain services (friendships, presence, rate limiting)
│   └── websocket/               # Socket.IO server integration
└── pyproject.toml               # Python package metadata and dependencies
```

## Configuration
All runtime configuration is sourced from environment variables (optionally via `.env`). Key settings include:

| Variable | Description | Default |
| --- | --- | --- |
| `APP_NAME` | Application display name | `Self-Hosted Video Chat API` |
| `APP_VERSION` | Semantic version string | `0.0.1` |
| `DATABASE_URL` | Sync SQLAlchemy URL for PostgreSQL (converted to async) | `postgresql+psycopg://video:video@localhost:5432/videochat` |
| `REDIS_URL` | Redis connection string used for presence + rate limits | `redis://localhost:6379/0` |
| `SESSION_SECRET` / `SESSION_COOKIE_NAME` / `SESSION_MAX_AGE_SECONDS` | Cookie session configuration | `dev-secret` / `session` / 604800 |
| `JWT_SECRET` / `JWT_ALGORITHM` / `ACCESS_TOKEN_TTL_SECONDS` / `REFRESH_TOKEN_TTL_SECONDS` | Token security parameters | `dev-jwt-secret` / `HS256` / 900 / 2592000 |
| `LOGIN_RATE_LIMIT_ATTEMPTS` / `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Throttling thresholds | `5` / `60` |

Refer to [`config.py`](videochat_api/config.py) for the authoritative list and helper properties. 【F:apps/api/videochat_api/config.py†L6-L41】

## Local Development
1. **Install dependencies**
   ```bash
   cd apps/api
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -e .[dev]
   ```
2. **Provision services**
   - PostgreSQL with a database named `videochat` (matching `DATABASE_URL`).
   - Redis instance reachable at `REDIS_URL`.
3. **Apply database migrations** (once services are running):
   ```bash
   alembic upgrade head
   ```
4. **Run the API server**
   ```bash
   uvicorn videochat_api.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The `videochat_api.main` module exposes both the FastAPI app and Socket.IO ASGI entrypoint. 【F:apps/api/videochat_api/main.py†L30-L62】
5. **Запуск контейнера**
   ```bash
   docker compose -f ../../infra/docker/docker-compose.dev.yml up -d
   ```
   
## Testing
Execute the automated test suite with:
```bash
pytest
```
The tests cover cookie- and token-based login flows, refresh rotation, friend workflows, and search validation. 【F:apps/api/tests/test_auth.py†L7-L83】【F:apps/api/tests/test_friends.py†L1-L129】【F:apps/api/tests/test_users.py†L1-L54】

## Проверка работоспособности
1. **Подготовьте окружение.** Активируйте виртуальное окружение и установите зависимости разработчика, включая `aiosqlite`, с помощью `pip install -e .[dev]`. Это обеспечит наличие асинхронного SQLite-драйвера, который использует тестовый стенд. 【F:apps/api/pyproject.toml†L31-L49】【F:apps/api/tests/conftest.py†L27-L47】
2. **Запустите автотесты.** Команда `pytest` поднимает FastAPI-приложение в памяти, разворачивает временную БД SQLite и мок Redis, после чего прогоняет сценарии аутентификации, дружбы и видеокомнат. 【F:apps/api/tests/conftest.py†L11-L118】【F:apps/api/tests/test_rooms.py†L1-L142】
3. **Проверьте ручные сценарии (опционально).** Разверните PostgreSQL и Redis, выполните `alembic upgrade head`, затем запустите `uvicorn videochat_api.main:app --reload` и протестируйте REST/Socket.IO маршруты через Postman или клиент Socket.IO. 【F:apps/api/README.md†L48-L84】【F:apps/api/videochat_api/main.py†L30-L62】【F:apps/api/videochat_api/websocket/server.py†L229-L342】

### Проверка комнат вручную

1. **Откройте Swagger UI или Postman.** После запуска сервера интерфейс Swagger доступен по адресу `http://localhost:8000/docs` и содержит все REST-эндпоинты комнат. Postman подойдёт, если удобнее сохранять запросы и токены.
2. **Зарегистрируйте двух пользователей.** В Swagger выполните `POST /auth/register` дважды с разными `username`/`email`, либо подготовьте аналогичные запросы в Postman. Затем залогиньтесь через `POST /auth/login`, чтобы получить cookie-сессию (для браузера) или `access_token` (для заголовка `Authorization: Bearer ...`). 【F:apps/api/videochat_api/api/endpoints/auth.py†L31-L187】
3. **Станьте друзьями.** Один пользователь отправляет запрос `POST /friends/request`, второй подтверждает через `POST /friends/accept`. Без дружбы комната не будет создана. 【F:apps/api/videochat_api/api/endpoints/friends.py†L61-L199】
4. **Создайте комнату.** Аутентифицированный пользователь вызывает `POST /rooms` (в Swagger или Postman) и передаёт `friend_id` — идентификатор друга. В ответе вернётся `room_id` и статус `waiting`. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L49-L108】
5. **Подтвердите статус.** Второй пользователь выполняет `GET /rooms/{room_id}` — ответ уже возвращает 200 и статус `waiting`, а после подключения обоих участников переключается на `active`. Этот же эндпоинт помогает убедиться, что выход через `POST /rooms/{room_id}/leave` меняет статус на `ending/closed`. Пользователи вне дружбы или с неподтверждёнными запросами получат 403. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L111-L164】
6. **Протестируйте WebSocket-сигналинг.** Для проверки сигналинга воспользуйтесь клиентом Socket.IO (например, `npx socket.io-client-cli`). Подключитесь к `ws://localhost:8000/ws/rooms` с параметрами `roomId=<room_id>` и теми же токенами/куки, что использовались при REST-вызовах. После соединения отправьте событие `room:signal` с типом `offer`/`answer` и убедитесь, что второй клиент получает ретрансляцию `room:signal`. 【F:apps/api/videochat_api/websocket/server.py†L229-L342】

> 💡 **Совет:** если вы используете Swagger, браузер автоматически сохраняет cookie сессии. В Postman для повторных вызовов удобнее сохранять переменную `{{access_token}}` и подставлять её в заголовок `Authorization`.

## Database Schema & Migrations
Alembic migration scripts live under `alembic/versions`. The current baseline creates user, device, session, and friendship tables that align with the SQLAlchemy models. Run `alembic revision --autogenerate -m "message"` to add new migrations after editing models. 【F:apps/api/alembic/versions/20240912_000001_create_users_table.py†L1-L20】【F:apps/api/videochat_api/models/user.py†L1-L34】【F:apps/api/videochat_api/models/device.py†L1-L46】【F:apps/api/videochat_api/models/session.py†L1-L44】【F:apps/api/videochat_api/models/friend.py†L1-L44】

## REST API Surface
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/healthz` | Liveness probe for infrastructure checks. 【F:apps/api/videochat_api/api/endpoints/system.py†L7-L10】 |
| `POST` | `/auth/register` | Register a new user with username, email, and password. 【F:apps/api/videochat_api/api/endpoints/auth.py†L31-L75】 |
| `POST` | `/auth/login` | Authenticate via username/email and negotiate web or device sessions. 【F:apps/api/videochat_api/api/endpoints/auth.py†L78-L170】 |
| `POST` | `/auth/refresh` | Rotate refresh tokens for device sessions. 【F:apps/api/videochat_api/api/endpoints/auth.py†L173-L214】 |
| `POST` | `/auth/logout` | Revoke the active session (cookie or device). 【F:apps/api/videochat_api/api/endpoints/auth.py†L217-L259】 |
| `GET` | `/auth/me` | Fetch the authenticated user's profile. 【F:apps/api/videochat_api/api/endpoints/auth.py†L262-L263】 |
| `GET` | `/friends` | List friendships, optionally filtered by status. 【F:apps/api/videochat_api/api/endpoints/friends.py†L61-L92】 |
| `POST` | `/friends/request` | Create or re-send a friend request. 【F:apps/api/videochat_api/api/endpoints/friends.py†L95-L157】 |
| `POST` | `/friends/accept` | Accept an incoming request and notify both users. 【F:apps/api/videochat_api/api/endpoints/friends.py†L160-L199】 |
| `POST` | `/friends/decline` | Decline a pending request and notify requester. 【F:apps/api/videochat_api/api/endpoints/friends.py†L202-L223】 |
| `GET` | `/users/search` | Search for other users by username prefix. 【F:apps/api/videochat_api/api/endpoints/users.py†L16-L55】 |
| `POST` | `/rooms` | Create a waiting video room for a friend and emit an invite. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L49-L108】 |
| `GET` | `/rooms/{room_id}` | Fetch current room status for participants. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L111-L134】 |
| `POST` | `/rooms/{room_id}/leave` | Leave the room and notify the remaining participant. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L137-L164】 |

All non-system routes require authentication supplied either by the web session cookie or a `Bearer` JWT access token. Dependency wiring handles session resolution and automatic revocation for blocked users. 【F:apps/api/videochat_api/dependencies.py†L47-L97】

## Real-Time Socket Gateway
The Socket.IO server shares the FastAPI lifecycle and accepts either JWT access tokens or browser session cookies + CSRF token for authentication. On connect it:
1. Validates the session and loads friend IDs. 【F:apps/api/videochat_api/websocket/server.py†L53-L115】
2. Marks the user online in Redis and publishes presence updates to friends. 【F:apps/api/videochat_api/websocket/server.py†L117-L188】
3. Streams current presence snapshots and refreshes TTLs while the socket remains open. 【F:apps/api/videochat_api/websocket/server.py†L120-L177】

Disconnecting clears the presence state (after the final client leaves) and cancels the refresh loop. 【F:apps/api/videochat_api/websocket/server.py†L189-L218】

### Room namespace

The `/rooms` Socket.IO namespace handles WebRTC signaling and chat messages between two room participants:

1. The connecting client supplies the `roomId` and authenticates via JWT or cookie + CSRF. 【F:apps/api/videochat_api/websocket/server.py†L229-L292】
2. `RoomService` verifies membership, persists joins, and keeps Redis caches in sync. 【F:apps/api/videochat_api/services/rooms.py†L63-L152】
3. Signals (`type` + payload) are relayed to the peer via `room:signal`, while text chat uses `room:message`. 【F:apps/api/videochat_api/websocket/server.py†L316-L342】
4. Disconnects automatically call the leave workflow and broadcast `room:user_left`. 【F:apps/api/videochat_api/websocket/server.py†L294-L314】

## Security Considerations
- Web sessions use signed, HTTP-only cookies paired with CSRF tokens for logout and friend mutations. 【F:apps/api/videochat_api/api/endpoints/auth.py†L130-L169】【F:apps/api/videochat_api/dependencies.py†L72-L97】
- Device sessions enforce refresh token rotation and revoke tokens across devices when a user is blocked. 【F:apps/api/videochat_api/auth/session.py†L146-L211】【F:apps/api/videochat_api/dependencies.py†L90-L97】
- Login attempts are throttled per client host. Redis outages fall back to a permissive limiter to keep login functional during incidents. 【F:apps/api/videochat_api/api/endpoints/auth.py†L88-L117】【F:apps/api/videochat_api/dependencies.py†L25-L44】

## Troubleshooting
- Ensure PostgreSQL and Redis endpoints match the configured URLs before launching the API.
- If Socket.IO clients fail to authenticate, verify that web requests include the CSRF header (`x-csrf-token`) and that cookies are forwarded.
- Redis downtime disables rate limiting and presence updates; monitor logs for warnings emitted from the dependency layer. 【F:apps/api/videochat_api/dependencies.py†L25-L36】【F:apps/api/videochat_api/websocket/server.py†L141-L175】
