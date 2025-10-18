# Видео-чат API — инструкции для агента

## Что делает сервис
- Приложение `videochat_api` — это FastAPI + Socket.IO, обёрнутые адаптером `SocketIOFastAPIApp`, чтобы REST, Swagger и вебсокеты работали в одном ASGI-приложении.
- Lifespan FastAPI открывает асинхронный движок SQLAlchemy и Redis-клиент, создаёт `PresenceService` и помещает всё в `app.state`.
- REST-роутеры: `auth`, `users`, `friends`, `rooms`, `system`. Вебсокеты живут в `websocket/server.py` (корневой namespace + `/rooms`).

## Ключевые потоки
- **Аутентификация.** `session_manager` обслуживает web-cookie (`SessionKind.WEB`) и device-сессии (`SessionKind.DESKTOP/TAURI`), хешируя токены и обновляя `last_seen_at`. Логаут проверяет CSRF или refresh и отзывает сессию.
- **Дружба.** Модель `FriendRelationship` использует `passive_deletes`, чтобы удаление пользователя не ломало связи. События идут в Socket.IO-комнаты `user:{id}`.
- **Комнаты.** `RoomService` проверяет дружбу, следит за участниками и целевыми приглашениями через `target_user_id`, синхронизирует Redis (ключи `room:{id}` + `room:{id}:participants`) и уведомляет Socket.IO.
- **Presence и rate limiting.** Redis хранит TTL присутствия и логин-лимиты. При недоступности используется `NullRateLimiter`, presence просто не обновляется.

## Как работать с кодом
1. Перед изменениями изучайте релевантные модули в `videochat_api/*` и схемы в `schemas/` — REST-ответы формируются через Pydantic.
2. Если правите доменную логику (auth, rooms, friends), проверяйте, что соответствующие сервисы обновляют Redis и Socket.IO-события.
3. При добавлении полей в модели не забудьте про миграцию и обновление Pydantic-схем.
4. Любые изменения REST/Socket.IO требуют актуализации `knowledge/` и подсказок в `prompts/`, чтобы документация оставалась правдивой.
5. Новые фичи сопровождайте тестами в `tests/`. Фикстуры уже предоставляют `_FakeRedis`, подмену rate limiter и in-memory SQLite.

## Проверки
- Основная команда — `pytest` из каталога `apps/api`.
- Для ручной проверки используйте `uvicorn videochat_api.main:app --reload` и сценарий из README: регистрация, дружба, создание комнаты, join/leave.
- При изменениях Socket.IO удобно держать локальный клиент (`python-socketio`) и следить за событиями в комнатах `user:{id}` и `video-room:{room}`.

## Документация
- README, файлы `knowledge/` и подсказки `prompts/` — часть пользовательской документации. После правок API, схем, миграций или сокетов обязательно обновляйте соответствующие записи.
- Поддерживайте тексты на русском языке и описывайте как текущее состояние, так и необходимые регрессионные проверки.
