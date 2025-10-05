# API SPEC TODO — FastAPI

## База данных (минимум)

- Users(id, username, email, password_hash, created_at, is_blocked)
- Devices(id, user_id, kind[web|tauri], refresh_token_hash, last_seen_at)
- Friends(user_id, friend_id, status[requested|accepted|blocked], created_at)
- Rooms(id, type[direct|group], owner_id, created_at)
- RoomMembers(room_id, user_id, role[owner|moderator|member], joined_at)
- Calls(id, room_id, started_at, ended_at, initiator_id, ended_reason)
- Messages(id, room_id, sender_id, content, type[text|system], created_at)
- TurnCredentials(id, user_id, username, password, expires_at)

Индексы: Friends(user_id,status), RoomMembers(room_id), Messages(room_id,created_at).

## Endpoints (черновик)

- `POST /auth/register` — создать пользователя (валидация, Argon2id).
- `POST /auth/login` — веб: cookie‑сессия; desktop: выдавать access+refresh.
- `POST /auth/refresh` — ротация refresh.
- `POST /auth/logout` — инвалидация сессии/refresh.
- `GET /me` — текущий пользователь.
- `GET /users/search?q=` — поиск для добавления друзей.

- `POST /friends/request` — отправить заявку.
- `POST /friends/accept` — принять.
- `POST /friends/decline` — отклонить/удалить.
- `GET /friends` — список друзей с presence.

- `POST /rooms` — создать комнату (group).
- `GET /rooms/:id` — инфо, участники.
- `POST /rooms/:id/join|leave` — членство.
- `GET /rooms/:id/messages` — чат истории (пагинация).
- `POST /rooms/:id/messages` — отправить текст.

- `GET /webrtc/ice-config` — STUN/TURN (креды живут 60–120 сек, только для аутентифицированных).
- `GET /healthz` — health API.

## WebSocket (socket.io) события

- Личные: `presence:update`, `call:ring`, `call:cancel`
- Комнаты: `room:join`, `room:leave`, `room:members`
- Звонок: `call:invite`, `call:accept`, `call:decline`, `call:end`
- WebRTC: `webrtc:offer`, `webrtc:answer`, `webrtc:candidate`
- Чат: `chat:message`

## Безопасность

- CSRF для cookie‑флоу, SameSite, httpOnly, secure.
- RBAC middleware (user/moderator/admin).
- Rate‑limit логина/регистрации (Redis).
