# Video Chat API

## Обзор

Video Chat API — асинхронное FastAPI-приложение, отвечающее за регистрацию и аутентификацию пользователей, управление дружбой, видеокомнатами и трансляцию статусов присутствия. Сервис объединяет REST-эндпоинты и Socket.IO-шлюз, использует PostgreSQL для хранения данных и Redis для кеширования комнат, трекинга присутствия и реализации rate limiting.

## Возможности

- **Единый жизненный цикл приложения**: при запуске инициализируются подключение к БД, клиент Redis, HTTP-роуты и Socket.IO-сервер. 【F:apps/api/videochat_api/main.py†L17-L62】
- **Гибкая конфигурация через `pydantic-settings`**: параметры БД, Redis, JWT и cookie-сессий берутся из переменных окружения. 【F:apps/api/videochat_api/config.py†L6-L44】
- **Парольная аутентификация**: поддерживаются веб-сессии (cookie + CSRF) и сессии устройств (JWT + refresh). 【F:apps/api/videochat_api/api/endpoints/auth.py†L31-L259】【F:apps/api/videochat_api/auth/session.py†L36-L211】
- **Система дружбы**: запрос, принятие, отклонение и оповещения друзей через REST и Socket.IO. 【F:apps/api/videochat_api/api/endpoints/friends.py†L19-L223】
- **Поиск пользователей**: безопасный поиск по префиксу имени с фильтрацией заблокированных аккаунтов. 【F:apps/api/videochat_api/api/endpoints/users.py†L91-L132】
- **Управление видеокомнатами**: создание, ручное присоединение через `POST /rooms/{room_id}/join`, просмотр статуса, выход, запрос текущей комнаты пользователя и админский список активных/ожидающих комнат. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L41-L198】
- **Администрирование**: пользователи с флагом `is_admin` могут получать расширенный список пользователей (включая устройства и сессии) и контролировать комнаты. 【F:apps/api/videochat_api/models/user.py†L15-L24】【F:apps/api/videochat_api/api/endpoints/users.py†L27-L88】
- **Rate limiting и presence**: Redis хранит лимиты логина и статусы онлайн, деградируя в безопасный режим при недоступности. 【F:apps/api/videochat_api/dependencies.py†L19-L43】【F:apps/api/videochat_api/services/presence.py†L16-L94】

## Структура проекта

```
apps/api/
├── alembic/                     # Миграции БД (PostgreSQL)
├── tests/                       # Набор pytest-тестов
├── videochat_api/
│   ├── api/                     # FastAPI-роутеры и эндпоинты
│   ├── auth/                    # Хеширование паролей, управление сессиями
│   ├── db/                      # Настройка SQLAlchemy и сессий
│   ├── models/                  # ORM-модели пользователей, устройств, сессий, друзей, комнат
│   ├── schemas/                 # Pydantic-схемы ответов и запросов
│   ├── services/                # Бизнес-логика (комнаты, дружба, presence, rate limiting)
│   └── websocket/               # Интеграция Socket.IO
└── pyproject.toml               # Зависимости пакета
```

## Конфигурация

Основные переменные окружения (значения по умолчанию приведены для dev-режима):

| Переменная | Назначение | Значение по умолчанию |
| --- | --- | --- |
| `APP_NAME` | Название сервиса | `Self-Hosted Video Chat API` |
| `APP_VERSION` | Версия API | `0.0.1` |
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql+psycopg://video:video@localhost:5432/videochat` |
| `REDIS_URL` | Строка подключения к Redis | `redis://localhost:6379/0` |
| `SESSION_SECRET` / `SESSION_COOKIE_NAME` / `SESSION_MAX_AGE_SECONDS` | Настройки cookie-сессий | `dev-secret` / `session` / `604800` |
| `JWT_SECRET` / `JWT_ALGORITHM` / `ACCESS_TOKEN_TTL_SECONDS` / `REFRESH_TOKEN_TTL_SECONDS` | JWT и refresh-токены | `dev-jwt-secret` / `HS256` / `900` / `2592000` |
| `LOGIN_RATE_LIMIT_ATTEMPTS` / `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Ограничения на логины | `5` / `60` |

Полный список параметров находится в `videochat_api/config.py`. 【F:apps/api/videochat_api/config.py†L6-L41】

## Локальная разработка

1. **Установите зависимости**
   ```bash
   cd apps/api
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -e .[dev]
   ```
2. **Поднимите внешние сервисы**: PostgreSQL (БД `videochat`) и Redis.
3. **Примените миграции**:
   ```bash
   alembic upgrade head
   ```
4. **Запустите сервер**:
   ```bash
   uvicorn videochat_api.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Приложение поднимет REST и Socket.IO на едином адресе. 【F:apps/api/videochat_api/main.py†L55-L62】
5. **Docker-окружение** (опционально): `docker compose -f ../../infra/docker/docker-compose.dev.yml up -d`

## Тестирование

Автотесты запускаются командой:

```bash
pytest
```

Тесты используют in-memory SQLite, фейковый Redis и проверяют сценарии аутентификации, дружбы, видеокомнат и админских эндпоинтов. 【F:apps/api/tests/conftest.py†L1-L118】【F:apps/api/tests/test_rooms.py†L1-L214】【F:apps/api/tests/test_users.py†L1-L94】

## Проверка работоспособности

1. **Подготовьте окружение.** Активируйте виртуальное окружение, установите dev-зависимости (`pip install -e .[dev]`). Это добавит `httpx`, `pytest`, `aiosqlite` и другие инструменты для локального запуска. 【F:apps/api/pyproject.toml†L31-L49】
2. **Запустите автотесты.** `pytest` создаёт временную БД, подменяет Redis и гоняет ключевые сценарии.
3. **Ручная проверка комнат.** После запуска `uvicorn` откройте Swagger UI `http://localhost:8000/docs` и выполните последовательность:
   1. **Создание тестовой пары.** Зарегистрируйте двух пользователей (`POST /auth/register`) и авторизуйте их по очереди (`POST /auth/login`). Убедитесь, что в ответе присутствуют cookie и CSRF-токен для веб-сессии.
   2. **Установление дружбы.** Пользователь A отправляет заявку (`POST /friends/request`), пользователь B принимает её (`POST /friends/accept`). Проверяйте, что событие дружбы появляется в Socket.IO-комнатах `user:{id}` (можно отследить через подключённого клиента или логи тестового socket.io-клиента). 【F:apps/api/videochat_api/api/endpoints/friends.py†L33-L205】
   3. **Создание комнаты.** Пользователь A вызывает `POST /rooms` с `target_user_id` равным идентификатору пользователя B. В ответе получите `room.id` и статус `waiting`. Сразу после этого в комнату `user:{target}` прилетает событие `room:invited` через Socket.IO. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L82-L118】
   4. **Подтверждение участия.** Под пользователем B выполните `POST /rooms/{room_id}/join`. Если запрос успешен, статус комнаты переключится на `active`, а в пространство `video-room:{room_id}` и личные комнаты участников отправится событие `room:user_joined`. Для надёжности повторите запрос — второй вызов должен вернуть `changed=false` (в теле `room` статус не меняется), что подтверждает идемпотентность. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L152-L198】
   5. **Проверка просмотра статуса.** Пользователь A или B могут запросить `GET /rooms/{room_id}` и увидеть актуальный список участников. Посторонний пользователь получит `403 Forbidden`. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L120-L150】
   6. **Закрытие сеанса.** Завершите проверку вызовом `POST /rooms/{room_id}/leave` от каждого участника. После выхода последнего пользователя статус перейдёт в `closed`, а событие `room:user_left` будет разослано подключённым клиентам. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L131-L198】
   7. **Админский обзор.** Авторизуйтесь под администратором и запросите `GET /rooms`, чтобы убедиться, что закрытые комнаты не отображаются в списке активных, а ожидающие (если кто-то не присоединился) видны с правильным статусом. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L59-L79】

## Схема базы данных и миграции

Миграции лежат в `alembic/versions`. Последовательность включает:

- создание таблицы пользователей; 【F:apps/api/alembic/versions/20240912_000001_create_users_table.py†L1-L37】
- добавление устройств и сессий; 【F:apps/api/alembic/versions/20241005_000002_add_devices_and_sessions.py†L1-L89】
- таблицу дружбы; 【F:apps/api/alembic/versions/20241005_000003_add_friends_table.py†L1-L68】
- модели видеокомнат; 【F:apps/api/alembic/versions/20241005_000004_create_rooms_tables.py†L1-L85】
- флаг `is_admin` у пользователей. 【F:apps/api/alembic/versions/20241010_000005_add_is_admin_to_users.py†L1-L35】

После изменения моделей запускайте `alembic revision --autogenerate -m "message"` и проверяйте результат.

## REST API

| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/healthz` | Проверка готовности сервиса. 【F:apps/api/videochat_api/api/endpoints/system.py†L7-L10】 |
| `POST` | `/auth/register` | Регистрация пользователя. |
| `POST` | `/auth/login` | Аутентификация (cookie или устройство). |
| `POST` | `/auth/refresh` | Ротация refresh-токена устройства. |
| `POST` | `/auth/logout` | Выход из текущей сессии. |
| `GET` | `/auth/me` | Профиль текущего пользователя (включая `isAdmin`). |
| `GET` | `/users` | **Только админы.** Возвращает всех пользователей; параметр `include` позволяет добавить `devices` и `sessions`. 【F:apps/api/videochat_api/api/endpoints/users.py†L27-L88】 |
| `GET` | `/users/search` | Поиск по имени. |
| `GET` | `/friends` | Список дружеских связей. |
| `POST` | `/friends/request` | Отправить заявку в друзья. |
| `POST` | `/friends/accept` | Принять заявку. |
| `POST` | `/friends/decline` | Отклонить заявку. |
| `POST` | `/rooms` | Создать комнату и пригласить друга. |
| `GET` | `/rooms` | **Только админы.** Список активных и ожидающих комнат. |
| `GET` | `/rooms/me` | Список активных и ожидающих комнат пользователя. |
| `GET` | `/rooms/{room_id}` | Получить статус комнаты по UUID. |
| `POST` | `/rooms/{room_id}/leave` | Покинуть комнату. |

Все пользовательские и дружеские маршруты требуют аутентификации (cookie или `Authorization: Bearer`).

## Socket.IO-шлюз

Шлюз живёт в `videochat_api/websocket/server.py` и разделён на пространства:

- **Корневой namespace** — авторизация по JWT или cookie+CSRF, публикация presence, рассылка обновлений друзьям. 【F:apps/api/videochat_api/websocket/server.py†L53-L188】
- **`/rooms` namespace** — сигналинг WebRTC и чат между участниками комнаты: проверка членства, пересылка сообщений, обработка отключений. 【F:apps/api/videochat_api/websocket/server.py†L229-L342】

## Роль администратора

В модели пользователя добавлен флаг `is_admin`. Только админы могут:

- вызывать `GET /users` с опциональными параметрами `include=devices`/`include=sessions`;
- просматривать все комнаты через `GET /rooms`.

Управление правами администратора осуществляется миграциями или скриптами, изменяющими поле `users.is_admin`.

## Соображения безопасности

- Повторное использование refresh-токенов приводит к ревокации сессий. 【F:apps/api/videochat_api/api/endpoints/auth.py†L173-L259】
- Для cookie-сессий обязательна передача заголовка CSRF при мутациях. 【F:apps/api/videochat_api/dependencies.py†L72-L97】
- Redis-недоступность отключает rate limiting и presence; в логах появляется предупреждение, а операции продолжают выполняться. 【F:apps/api/videochat_api/dependencies.py†L25-L44】
- Доступ к комнатам ограничен дружбой и текущим участием; админский эндпоинт только читает состояния. 【F:apps/api/videochat_api/services/rooms.py†L70-L167】【F:apps/api/videochat_api/api/endpoints/rooms.py†L41-L152】

## Устранение неполадок

- Проверьте корректность переменных окружения БД и Redis до запуска.
- При ошибках авторизации удостоверьтесь, что передаются cookie, CSRF и актуальные JWT.
- Если клиенты не получают presence/room-ивенты, убедитесь в доступности Redis и отсутствии ошибок Socket.IO в логах.
