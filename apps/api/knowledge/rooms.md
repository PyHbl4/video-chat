# Комнаты видеозвонков

## Текущее состояние проекта
- FastAPI-приложение поднимается в `videochat_api/main.py` и объединяет REST-роутеры и Socket.IO-сервер. Redis инициализируется в лайфспане и передаётся в `PresenceService`. 【F:apps/api/videochat_api/main.py†L17-L45】
- Аутентификация реализована через cookie-сессии и JWT-токены, с хранением активных сессий в таблице `auth_sessions`. Вспомогательные операции инкапсулированы в `auth/session.py`. 【F:apps/api/videochat_api/api/endpoints/auth.py†L31-L259】【F:apps/api/videochat_api/auth/session.py†L36-L211】
- Дружба и уведомления покрываются REST-эндпоинтами и событиями Socket.IO. Идентификаторы друзей получаются функцией `get_friend_user_ids`, что позволяет определить, с кем допустимо устанавливать комнату. 【F:apps/api/videochat_api/api/endpoints/friends.py†L61-L223】【F:apps/api/videochat_api/services/friendships.py†L1-L73】
- WebSocket-шлюз уже синхронизирует присутствие пользователей, распределяя их по комнатам вида `user:{id}` и обновляя статусы в Redis. Эти механизмы можно переиспользовать для уведомлений о комнатах. 【F:apps/api/videochat_api/websocket/server.py†L92-L210】

## Целевое поведение комнат
1. **Создание**
   - Первый участник инициирует POST `/api/rooms`. Бэкенд проверяет, что пользователь аутентифицирован и не состоит в другой активной комнате.
   - Комната создаётся со статусом `waiting`, фиксируется инициатор, генерируется `room_id`, сохраняется в БД/Redis.
2. **Подключение второго участника**
   - Второй пользователь открывает WebSocket `/ws/rooms/{room_id}`. Сервер убеждается, что пользователи являются друзьями и в комнате меньше двух участников.
   - После присоединения статус переключается на `active`, оба участника получают событие `room:user_joined`.
3. **Signal обмен WebRTC**
   - Участники отправляют сообщения с типами `offer`, `answer`, `ice` через комнатный WebSocket. Сервер пересылает payload только второму участнику.
4. **Текстовые сообщения (опционально)**
   - Сообщения типа `message` ретранслируются обоим клиентам для чата.
5. **Отключение и закрытие**
   - При выходе участника (закрытие WS или POST `/api/rooms/{room_id}/leave`) сервер уведомляет партнёра (`room:user_left`).
   - Если один участник остался, статус `ending`. После завершения обоими — `closed`, ресурсы очищаются.
   - Таймаут бездействия (например, 10 минут) уничтожает комнату автоматически.
6. **Получение статуса**
   - GET `/api/rooms/{room_id}` возвращает текущий статус, участников, таймстемпы. Доступ открыт инициатору и приглашённому другу даже до фактического подключения. Остальные, включая пользователей с неподтверждённой дружбой, получают 403.

## Архитектурное решение
- **Хранилище**: ввести новую таблицу `rooms` и таблицу `room_participants` (или JSON-поле), либо использовать Redis для краткоживущих данных и БД для аудита. Предлагается комбинированный подход:
  - PostgreSQL хранит записи комнат (для истории и целостности).
  - Redis (ключи `room:{id}`) кэширует активное состояние и ускоряет проверки наличия участников.
- **Доменные модели**:
  - SQLAlchemy-модель `Room` (`id`, `status`, `initiator_id`, `created_at`, `closed_at`).
  - Опциональная модель `RoomParticipant` со ссылкой на `room_id`, `user_id`, `role`, `joined_at`, `left_at`.
  - Enum `RoomStatus` (`waiting`, `active`, `ending`, `closed`, `expired`).
- **Сервисы**:
  - `RoomService` в `services/rooms.py` с методами `create_room`, `add_participant`, `remove_participant`, `close_room`, `expire_idle_rooms`, `get_room`, `ensure_friendship`.
  - Интеграция с `PresenceService` для уведомлений о статусе комнаты друзьям через Socket.IO (`room:invite`, `room:closed`).
- **Схемы**:
  - Pydantic-модели в `schemas/room.py` для REST и WebSocket-пейлоадов.
- **WebSocket-слой**:
  - Новый namespace `/rooms` или использование `sio.Namespace` с комнатами вида `video-room:{room_id}`.
  - Авторизация реиспользует `_resolve_socket_user` (можно выделить в общий helper), проверяя, что пользователь участвует в комнате.
  - Сообщения делятся по типам (`signal`, `message`, `control`), валидация через Pydantic.
- **Фоновые задачи**:
  - При создании комнаты запускать `asyncio.create_task` или FastAPI background task, отслеживающую таймаут.
  - Периодически (cron/job) чистить просроченные комнаты из БД/Redis.

## План внедрения
1. **Модели и миграции**
   - Добавить SQLAlchemy-модели `Room`, `RoomParticipant` и Enum `RoomStatus`. 【F:apps/api/videochat_api/models/__init__.py†L1-L9】
   - Сгенерировать Alembic-миграцию с таблицами `rooms` и `room_participants` (FK на `users`).
2. **Схемы**
   - Создать `schemas/room.py` с DTO: `RoomCreateResponse`, `RoomStatusResponse`, `RoomParticipantSchema`, `RoomSignalMessage`.
3. **Сервисный слой**
   - Реализовать `services/rooms.py`:
     - Проверка дружбы (через `FriendshipService`).
     - Управление статусом и участниками (синхронно в БД, кэш в Redis).
     - Публикация событий через Socket.IO (`sio.emit`). 【F:apps/api/videochat_api/websocket/server.py†L92-L210】
4. **REST-эндпоинты**
   - Новый модуль `api/endpoints/rooms.py` с маршрутами:
     - `POST /rooms` — создать комнату.
     - `POST /rooms/{room_id}/leave` — покинуть.
     - `GET /rooms/{room_id}` — статус.
     - (опционально) `DELETE /rooms/{room_id}` — принудительно закрыть (для отладки).
   - Подключить роутер в `api/routes.py`.
5. **WebSocket-namespace**
   - Расширить `websocket/server.py` новым namespace, например `RoomNamespace`, зарегистрировать через `sio.register_namespace`.
   - Реализовать события: `connect`, `disconnect`, `signal`, `message`, `heartbeat`.
   - Реиспользовать аутентификацию `_resolve_socket_user`; добавить проверку участия пользователя в комнате.
6. **Redis-структуры**
   - Ключ `room:{room_id}:participants` (set) для мгновенного определения количества участников.
   - TTL обновляется при активности, по истечении — комната закрывается.
7. **Таймауты и очистка**
   - При переходе статуса в `closed` очищать кэш и обновлять `closed_at`.
   - Планировщик (background-task) регулярно вызывает `expire_idle_rooms`.
8. **Тесты**
   - Расширить pytest: 
     - Юнит-тесты `services/test_rooms.py` (создание, присоединение, лимиты, закрытие).
     - Интеграционные тесты REST/WebSocket (использовать `TestClient` + `socketio.AsyncClient`).
   - Замокать Redis и Socket.IO, аналогично тестам дружбы. 【F:apps/api/tests/test_friends.py†L15-L119】
9. **Документация**
   - Обновить README, knowledge-базу, описав новые эндпоинты и сценарии использования.

## Взаимодействие с WebRTC
- Комната служит signaling-сервером: пересылает SDP `offer/answer` и ICE-кандидаты между участниками через WebSocket.
- После обмена SDP медиапоток идёт peer-to-peer; серверу остаётся мониторить присутствие и завершение звонка.
- Для устойчивости можно логировать последние сообщения сигналинга и восстанавливать комнату при повторном подключении участника.

## Дополнительные соображения
- **Безопасность**: убедиться, что только друзья могут создавать/присоединяться друг к другу. Отказы возвращать 403.
- **Масштабирование**: Redis-ключи позволяют шардировать состояние; Socket.IO сервер можно масштабировать при использовании message broker (например, Redis pub/sub) через `socketio.AsyncRedisManager`.
- **Наблюдаемость**: добавить метрики (подсчёт активных комнат, длительность звонков) и расширить логирование при переходах статусов.

## Реализовано на текущий момент
- **Доменные объекты**: `Room` и `RoomParticipant` описывают жизненный цикл видеокомнат, а Alembic-миграция `20241005_000004` создаёт необходимые таблицы и enum-типы. 【F:apps/api/videochat_api/models/room.py†L1-L82】【F:apps/api/alembic/versions/20241005_000004_create_rooms_tables.py†L1-L85】
- **Сервисный слой**: `RoomService` управляет созданием комнат, присоединением участников, выходом, кэшем в Redis, а также предоставляет выборки текущей комнаты пользователя и списка активных комнат для админов. 【F:apps/api/videochat_api/services/rooms.py†L1-L220】
- **REST API**: эндпоинты `/rooms` покрывают создание, просмотр конкретной комнаты, получение собственной комнаты (`GET /rooms/me`), админский список (`GET /rooms`) и выход с уведомлениями через Socket.IO. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L1-L170】
- **WebSocket**: namespace `/rooms` авторизует клиентов, передаёт signaling-сообщения и автоматически инициирует выход при разрыве соединения. 【F:apps/api/videochat_api/websocket/server.py†L229-L342】
- **Тесты и документация**: добавлены pytest-сценарии на новый функционал комнат и обновлена README/knowledge-база. 【F:apps/api/tests/test_rooms.py†L1-L214】【F:apps/api/README.md†L1-L175】
