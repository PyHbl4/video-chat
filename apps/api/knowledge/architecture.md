# Архитектура приложения

Документ описывает устройство backend'а видеочата на FastAPI и основные
правила работы с кодовой базой. Используйте его как шпаргалку при
онбординге и планировании изменений.

## Обзор модулей
- `videochat_api/main.py` — создаёт FastAPI-приложение, подключает CORS,
  регистрирует HTTP-роутеры и оборачивает их Socket.IO-сервером через
  `socketio.ASGIApp`.
- `videochat_api/api/routes.py` — объединяет публичные маршруты и
  подключает эндпоинты `system`, `auth` и `admin` из `videochat_api.api.endpoints`.
- `videochat_api/dependencies.py` — общие зависимости (получение текущего
  пользователя, создание `AsyncSession`, доступ к Redis).
- `videochat_api/db/` — базовый класс ORM (`base.py`) и фабрика двигателей
  и сессий (`session.py`) поверх `sqlalchemy.ext.asyncio`.
- `videochat_api/models/` — SQLAlchemy-модели: `User`, `Device` и
  `Session`, описывающие аккаунты, клиентские устройства и авторизационные
  сессии.
- `videochat_api/auth/` — домен аутентификации: хеширование паролей,
  генерация/ревокация access- и refresh-токенов (`session.SessionService`).
- `videochat_api/schemas/` — Pydantic v2-модели для запросов и ответов
  (`AuthLoginRequest`, `AuthSessionResponse` и др.).
- `videochat_api/services/rate_limiter.py` — Redis-ограничитель, который
  защищает точки входа от брутфорса.
- `videochat_api/services/rbac.py` — управление ролями (`RoleService`),
  проверка прав доступа и аудит действий администраторов.
- `videochat_api/websocket/server.py` — инициализация Socket.IO сервера и
  обработчики событий подключения/отключения.

## Потоки данных
```
[Клиент HTTP]
    |
    v
FastAPI Router (videochat_api.api.endpoints.*)
    |
    v
Зависимости (videochat_api.dependencies)
    |
    v
Сервисы (auth.SessionService, rate_limiter)
    |
    v
Сессия БД (AsyncSession) / Redis
    |
    v
PostgreSQL / Redis
```

- Ответы сериализуются Pydantic-схемами из `videochat_api.schemas`.
- Redis используется как вспомогательное хранилище для токенов и лимитов,
  поэтому его подключение обязательно даже при локальной разработке.

## Фоновые и realtime-потоки
```
HTTP Endpoint (login/logout)
    |
    v
SessionService.issue_tokens()
    |
    v
Redis (rate limits, session cache)
    |
    v
PostgreSQL (persisted sessions/devices)

Socket.IO Client
    |
    v
AsyncServer (videochat_api.websocket.server.sio)
    |
    v
Handlers -> Redis / будущие сервисы сигналинга
```

- Пока отдельного Celery/фонового воркера нет; долгие операции выносите в
  асинхронные задачи или планируйте выделенный сервис.
- WebSocket-уведомления шлите через `sio.emit` или `sio.enter_room` —
  логика комнат и сигналинга должна жить в отдельных модулях.

## Точки расширения
- Новые HTTP-модули подключайте в `videochat_api/api/routes.py`, сохраняя
  единый префикс и схемы ответа. Для административных разделов используйте
  `require_roles`, чтобы явно фиксировать требования к ролям.
- Если добавляете сущности, определяйте модель в `videochat_api/models`,
  схемы в `videochat_api/schemas` и зависимости в `videochat_api/
  dependencies.py`; не забудьте сгенерировать Alembic-миграцию.
- Для WebSocket-функциональности объявляйте хендлеры через
  `@sio.event`/`@sio.on`. Общую бизнес-логику выносите в отдельные
  модули, чтобы не перегружать `server.py`.
- Конфигурацию расширяйте через `videochat_api.config.Settings`; избегайте
  хардкода URL, секретов и TTL прямо в коде. Переменная
  `ADMIN_SUPERUSERS` используется `RoleService` для выдачи привилегий вне
  зависимости от записей в БД.

## Практики качества
- Держите `ruff`, `mypy` и `pytest` зелёными; команды уже прописаны в
  extras `[dev]` (`pip install -e .[dev]`).
- Соблюдайте асинхронный стиль: не выполняйте блокирующие вызовы в
  эндпоинтах или WebSocket-обработчиках.
- Прежде чем коммитить изменения в моделях, прогоняйте
  `alembic revision --autogenerate` и проверяйте дифф вручную.
- Логируйте значимые события через стандартный `logging`, добавляя
  контекст пользователя/устройства; `print` запрещён.

## Предупреждения
- `SessionService` хранит хеши refresh-токенов; не меняйте схему хранения
  без миграции и синхронизации с фронтендом.
- `request.state.auth_session` и `request.state.db_session`, которые
  выставляются в зависимостях, должны оставаться доступными на протяжении
  всего запроса.
- CORS в `create_fastapi_app()` ограничен локальными origin. При запуске
  фронтенда на другом порту обновляйте список `allow_origins`.
- Любые новые каталоги с Python-кодом обязаны содержать `__init__.py`,
  иначе Alembic autogenerate не увидит модели и импорты сломаются.
