# Присутствие и Socket.IO

- **PresenceService.** Хранит статусы пользователей в Redis по ключу `presence:user:{id}` и TTL (по умолчанию 120 секунд). Методы `set_online`, `set_offline`, `refresh_online`, `get_status` и `get_many_statuses` работают с ISO8601-датами. При недоступности Redis PresenceService не создаётся, но приложение продолжает работать.
- **Подписка друзей.** При подключении Socket.IO корневой namespace авторизует пользователя, ставит его online и рассылает `presence:update` всем друзьям. Затем отправляется снимок статусов друзей новому клиенту. Фоновая задача `_schedule_presence_refresh` обновляет TTL, пока остаются активные соединения.
- **Разрыв соединения.** Когда последний сокет пользователя отключается, presence помечается offline, фоновая задача отменяется, а друзьям отправляется `presence:update` со статусом `offline`.
- **Комнаты Socket.IO.**
  - Комнаты `user:{id}` используются для событий presence и дружбы (`friends:*`, `room:invited`, `room:user_joined`, `room:user_left`).
  - Namespace `/rooms` добавляет клиента в `video-room:{roomId}`, рассылая сигналы WebRTC (`room:signal`) и сообщения (`room:message`). При авторизации namespace повторно вызывает `RoomService.join_room`, поэтому REST и WebSocket держат единое состояние.
- **Интеграция с Redis.** RoomService пишет состояние комнат в Redis, чтобы фронтенд быстрее обновлялся, а Socket.IO использует те же данные для нотификаций. При недоступном Redis кэш и rate limiting отключаются, но REST/Socket.IO продолжают работать напрямую с БД.
- **Тесты.** Фикстуры в `tests/conftest.py` заменяют Redis на `_FakeRedis`, что позволяет детерминированно проверять события дружбы и комнат. Для проверки presence можно инспектировать `PresenceService._redis._store` или отслеживать события Socket.IO.
