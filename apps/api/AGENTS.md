# Руководство для ИИ-агента

## Краткое описание
Проект реализует backend видеочата на FastAPI. Основное приложение `videochat_api/main.py` создаёт FastAPI-инстанс, настраивает CORS и вешает Socket.IO-слой (`ASGIApp`) поверх HTTP-эндпоинтов. Конфигурация берётся из `videochat_api.config`, а инфраструктурные зависимости (PostgreSQL, Redis) инициализируются в lifespan-хэндлере.

## Архитектура и жизненный цикл
1. **Старт приложения**
   - Логика запуска сосредоточена в `create_fastapi_app()`: подключает `CORSMiddleware` с localhost-оригинами и импортирует модели, чтобы SQLAlchemy увидел маппинги.
   - Lifespan-функция открывает `AsyncEngine` через `videochat_api.db.session.get_engine()` и Redis-клиент `redis.asyncio.from_url`; объекты складываются в `app.state`, а при выключении корректно закрываются.
   - Итоговое ASGI-приложение — это `socketio.ASGIApp`, которое комбинирует Socket.IO (`videochat_api.websocket.server.sio`) и FastAPI (`fastapi_app`).

2. **HTTP API**
   - Корневой роутер (`videochat_api.api.routes`) монтирует `system` (health-check, настройки) и `auth` (регистрация, логин, refresh/logout).
   - Доступ к базе осуществляется через зависимость `get_session_dependency`, которая выдаёт `AsyncSession` поверх `asyncpg`.
   - Сериализация/валидация выполнена в `videochat_api.schemas` (Pydantic v2). Не меняйте `response_model`, если не готовы обновить фронтенд-клиентов.

3. **Аутентификация и сессии**
   - `videochat_api.auth.session.SessionService` управляет веб-сессиями (cookie+CSRF) и устройствами (JWT+refresh). Все токены хешируются перед сохранением.
   - `videochat_api.dependencies.get_current_user` ищет bearer-токен, затем cookie, валидирует сессию и сохраняет `auth_session` в `request.state` — не перезаписывайте это поле.
   - Ограничение логина реализовано через `RedisRateLimiter` (`videochat_api.services.rate_limiter`), который использует Redis из `app.state`.

4. **WebSocket/Socket.IO**
   - `videochat_api.websocket.server` поднимает `AsyncServer` с permissive CORS. Обработчики пока только логируют подключения/отключения, но служат точкой расширения для событий (rooms, signaling).

5. **Данные и модели**
   - SQLAlchemy-модели (`videochat_api.models`) описывают пользователей, устройства и авторизационные сессии. Базовый класс определяется в `videochat_api.db.base`.
   - Alembic миграции лежат в `alembic/versions`; при изменении моделей генерируйте новую ревизию и проверяйте автогенерацию на корректность.

## Запуск и инфраструктура
- **Python**: создайте venv в `apps/api`, установите зависимости `pip install -e .[dev]`.
- **Environment**: скопируйте `../../env/api.env.example` в `.env`; заполните `DATABASE_URL`, `REDIS_URL`, секреты для cookie и JWT.
- **Сторонние сервисы**: используйте `docker compose -f ../../infra/docker/docker-compose.dev.yml up -d db redis coturn` или предоставьте собственные PostgreSQL 15+/Redis 6+.
- **Миграции и запуск**:
  - Примените схему: `alembic upgrade head`.
  - Запустите API: `uvicorn videochat_api.main:app --reload --host 0.0.0.0 --port 8000`.
  - Socket.IO будет доступен на том же порту; фронтенд ожидает стандартные пути `/socket.io/`.
- **CI-команды**: `pytest`, `mypy videochat_api`, `ruff check videochat_api tests` — поддерживайте их в зелёном состоянии.

## Особенности и предупреждения
- **Согласованность конфигурации**: не захардкоживайте URL и секреты — берите значения из `settings`. Помните, что `database_url_async` вычисляется автоматически.
- **Состояние запроса**: middleware и зависимости полагаются на `request.state.auth_session` и `request.state.db_session`. Если внедряете новые middlewares, не очищайте эти поля.
- **Redis обязателен**: без него не работают rate-limiter и cookie-сессии. Тесты и ручные проверки будут падать на попытках обращения к Redis.
- **Alembic**: перед пушем убеждайтесь, что все изменения моделей сопровождаются миграциями. Отсутствие ревизий приводит к расхождению схемы в CI/проде.
- **CORS и Socket.IO**: список доверенных origin жёстко задан. При изменении портов фронтенда обновляйте `allow_origins`, иначе браузерные клиенты не подключатся.
- **Структура пакета**: любые новые каталоги с Python-кодом требуют `__init__.py`, чтобы их подхватывал импорт и Alembic autogenerate.