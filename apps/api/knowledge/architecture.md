# Архитектура сервиса

## Основные компоненты
- **Входная точка**: `videochat_api/main.py` создаёт FastAPI-приложение, подключает CORS, регистрирует роутеры и оборачивает их в Socket.IO ASGI-слой. В лайфспане открываются подключения к БД и Redis, после чего инициализируются сервисы присутствия и комнат. 【F:apps/api/videochat_api/main.py†L17-L62】
- **Роутинг**: `api/routes.py` объединяет системные, auth, user, friends и rooms эндпоинты. Каждая группа живёт в отдельном модуле внутри `api/endpoints`, что облегчает изоляцию зависимостей. 【F:apps/api/videochat_api/api/routes.py†L1-L15】
- **Конфигурация**: `config.py` использует `BaseSettings` для переменных окружения, вычисляет адреса БД/Redis и управляет параметрами CSRF. 【F:apps/api/videochat_api/config.py†L6-L44】
- **Доступ к данным**: `db/session.py` лениво создаёт AsyncEngine/SessionMaker на базе `DATABASE_URL` и экспонирует генератор `get_db_session`. Его используют все REST-эндпоинты. 【F:apps/api/videochat_api/db/session.py†L1-L39】
- **Модели**: ORM-слой включает пользователей, устройства, сессии, дружбу и видеокомнаты. Комнаты описаны в `models/room.py` и связаны с участниками через таблицу `room_participants`. 【F:apps/api/videochat_api/models/user.py†L1-L34】【F:apps/api/videochat_api/models/room.py†L1-L82】

## Сервисный уровень
- **FriendshipService** отвечает за проверку взаимных заявок и выборку друзей для уведомлений. 【F:apps/api/videochat_api/services/friendships.py†L1-L73】
- **PresenceService** работает поверх Redis: хранит TTL присутствия, рассылает события Socket.IO и обеспечивает деградацию при недоступности Redis. 【F:apps/api/videochat_api/services/presence.py†L16-L94】
- **RoomService** управляет созданием комнат, проверкой дружбы, присоединением/выходом участников и синхронизацией состояния в Redis. REST-эндпоинты используют его для `create_room`, `join_room`, `leave_room` и выборки комнат. 【F:apps/api/videochat_api/services/rooms.py†L44-L218】
- **RateLimiter** защищает логин от перебора паролей, переключаясь в `NullRateLimiter` при недоступном Redis. 【F:apps/api/videochat_api/services/rate_limiter.py†L1-L52】

## Реактивный слой
- **Socket.IO сервер** (`websocket/server.py`) обслуживает корневой namespace и `/rooms`. Корневой отвечает за presence и дружбу, namespace комнат маршрутизирует сообщения сигналинга и уведомляет участников о событиях `room:user_joined`/`room:user_left`. 【F:apps/api/videochat_api/websocket/server.py†L53-L342】
- События REST-слоя (например, создание комнаты) инициируют отправку событий в Socket.IO через общий объект `sio`, поэтому важно держать схему payload синхронной между REST и WebSocket-клиентами. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L82-L198】
