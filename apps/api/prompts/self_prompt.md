# Self Prompt — API Admin RBAC

## Роль и стиль работы
- Действую как ведущий FastAPI-разработчик, который отвечает за архитектуру, миграции БД и сопряжение HTTP/Socket.IO.
- Фокус: надёжный RBAC-слой, чистая схема данных, покрытие тестами и прозрачная документация для последующих команд (web/infra).

## Контекст проекта
- Текущее API обслуживает регистрацию, логин/рефреш, управление cookie/refresh токенами и health-check (`/auth/*`, `/healthz`).
- Lifespan `videochat_api.main` поднимает PostgreSQL (через `get_engine`) и Redis (rate limiter, сессии). Socket.IO-слой (`videochat_api.websocket.server.sio`) пока только логирует подключения.
- ORM-модели: `User`, `Device`, `AuthSession`. Поле `User.is_blocked` — единственный флаг модерации, ролей нет. Миграции: 20240912 (users), 20241005 (devices/sessions).
- Зависимости: `get_current_user` ревокает сессии заблокированного пользователя через `session_manager`. Настройки (`videochat_api.config.Settings`) не содержат списка супер-админов.
- Тесты (`apps/api/tests/test_auth.py`) проверяют веб/desktop-флоу и revoke при блоке, но нет сценариев ролей.

## Цели итерации
1. Добавить ролевую модель (user/moderator/admin) с миграцией и привязкой к пользователям.
2. Ввести проверку ролей для защищённых эндпоинтов и конфигурацию супер-админов.
3. Реализовать административные API: список пользователей, блокировка/разблокировка с аудитом, выдача ролей, мониторинг активных звонков/комнат.
4. Обеспечить аудит и логирование действий админов, а также влияние блокировок на сессии и Socket.IO.
5. Покрыть новые сценарии тестами и обновить документацию (README + knowledge base).

## Требования и ограничения
- Сохраняем совместимость существующих контрактов (`UserResponse`, login flow). Любые новые схемы документируем отдельно, не ломая фронт.
- Асинхронный стек: миграции через Alembic, но runtime — `asyncpg`. Любые новые модели добавляем в `videochat_api.models` с `__init__.py`.
- Redis обязателен для revoke/login; при блокировке надо чистить и HTTP-сессии, и, по возможности, активные Socket.IO соединения.
- Список супер-админов задаётся через `.env` (email/username); они должны иметь полный доступ независимо от записей `user_roles`.
- Пагинация/фильтры в административных списках нужны для Next.js админки (параметры: `page`, `page_size`, `q`, `role`, `blocked`).

## Архитектурный план и ключевые изменения
### 1. Миграции и модели
- Создать ENUM `user_role` (`user`, `moderator`, `admin`) и таблицу `user_roles` с PK `(user_id, role)`.
- Добавить модель `UserRole` (many-to-many) и отношение `User.roles`. При регистрации по умолчанию выдавать роль `user`.
- Ввести таблицу `moderation_events` с полями: `id`, `target_user_id`, `actor_user_id`, `action` (enum block/unblock/role_grant/role_revoke), `payload` (JSONB с причиной/ролями), `created_at`.
- Для мониторинга звонков подготовить каркас моделей (если ещё нет): временную таблицу `active_calls`/`active_rooms` или, до реализации полноценных моделей, сервис, читающий из Redis/Socket.IO состояния (прописать TODO на интеграцию с задачей `api-rooms-calls`).

### 2. Конфигурация
- В `Settings` добавить поля `admin_superusers: list[str]` (логины/email), `admin_page_size_default`, `admin_page_size_max`.
- Обновить `get_settings()` и `.env` пример.

### 3. Сервисы и зависимости
- Создать модуль `videochat_api.services.rbac` с классом `RoleService` (назначение/отзыв ролей, проверки, кеширование superusers).
- В `dependencies.py` добавить `get_current_user_with_roles` и фабрику `require_roles(*roles, allow_super=True)` — Dependency, бросающее 403 при недостатке прав. Кешировать роли в `request.state.user_roles`.
- Обновить `register_user` для автоматической вставки роли `user`.

### 4. Административные эндпоинты
- Новый роутер `videochat_api.api.endpoints.admin` с префиксом `/admin` и тегом `admin`.
    - `GET /admin/users` — список пользователей с пагинацией, фильтрами, сортировкой по `created_at`/`username`. Респонс: `AdminUserListResponse` (items, total, page, page_size).
    - `POST /admin/users/{user_id}/block` и `POST /admin/users/{user_id}/unblock` — принимают тело `{ "reason": str | None }`. Блокировка вызывает `session_manager.revoke_user_sessions` и пишет запись в `moderation_events`.
    - `POST /admin/users/{user_id}/roles` (назначить/снять). Тело `{ "roles": ["moderator", ...] }` с режимом `replace` или `add/remove` (уточнить). Каждое действие логируется.
    - `GET /admin/rooms/active` и `GET /admin/calls/active` — пока возвращают заглушку с пустым списком и полями для будущих данных (rooms/calls), но структура и dependency `require_roles("moderator", "admin")` должны быть готовы. Добавить TODO на интеграцию с моделями, которые появятся в задаче `api-rooms-calls`.
- Обновить `api/routes.py`, чтобы включить новый роутер.

### 5. Аудит и логирование
- Использовать `logging.getLogger(__name__)` в админских хэндлерах и сервисах: писать кто/кого/какое действие совершил.
- Сервис `RoleService` при изменении ролей создаёт запись в `moderation_events` (action `role_grant`/`role_revoke`).

### 6. Реалтайм взаимодействие
- При блокировке пользователя пробовать отключить активные Socket.IO соединения: `for sid in sio.manager.get_participants('/') ...` (проверить API) — если сложно без будущей реализации, оставить TODO, но убедиться, что revoke HTTP-сессий уже происходит.

## Инкрементный план работ
1. **Модели и миграции**: добавить `role.py`, `moderation_event.py`, обновить `User`, `models/__init__`, сгенерировать Alembic-миграцию.
2. **Настройки**: расширить `Settings`, обновить `.env` пример и README.
3. **Сервис ролей**: реализовать `RoleService` + зависимости, обновить регистрацию/авторизацию для подстановки ролей.
4. **Роутер /admin**: создать схемы (`schemas/admin.py`), эндпоинты, интеграцию с `RoleService`, аудитом и revoke сессий.
5. **Интеграция Socket.IO**: добавить отключение заблокированных пользователей (если feasibly), иначе зафиксировать TODO с описанием шага для задачи сигналинга.
6. **Тесты**: написать unit/functional тесты для RBAC (FastAPI TestClient + sqlite): доступ по ролям, блокировка, смена ролей, журнал.
7. **Документация**: обновить knowledge base (architecture/data_models/endpoints) и README.
8. **Финальная проверка**: `pytest`, `mypy videochat_api`, `ruff check videochat_api tests`.

## Тестирование
- `pytest` с новыми сценариями: доступ без роли (403), модераторский листинг, блокировка ⇒ revoke сессий, аудит.
- `mypy videochat_api` — статическая типизация новых сервисов/зависимостей.
- `ruff check videochat_api tests` — стиль кода.
- При возможности интеграционный тест Socket.IO (позже, когда появятся хэндлеры) — пометить как follow-up.

## Обновление документации
- `README.md` (раздел о запуске) — упомянуть новые переменные окружения и команды админки.
- `knowledge/data_models.md` — дописать `UserRole`, `ModerationEvent`.
- `knowledge/endpoints.md` — описать `/admin/*`.
- `knowledge/architecture.md` — добавить упоминание `RoleService` и RBAC flow.

## Риски и открытые вопросы
- Не определён формат ответов для активных комнат/звонков: задокументировать предположения и обозначить зависимость от задачи `api-rooms-calls`.
- Нужно решить, как хранить супер-админов (username vs email). Предлагаю использовать email, т.к. уникален — подтвердить с продуктом.
- Следует убедиться, что revoke сессий работает корректно в условиях параллельных запросов (добавить тест на повторную блокировку).
- Производительность: LIST пользователей может быть тяжёлым при больших объёмах — предусмотреть индексы (`is_blocked`, `created_at`).
