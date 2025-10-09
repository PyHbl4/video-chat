# Каталог эндпоинтов FastAPI

Документ описывает публичные и служебные маршруты backend'а видеочата. Все
пути подключаются без версионного префикса (корень FastAPI-приложения), если
не указано иное. Для защищённых операций требуется сессия (web-cookie или
Bearer-токен), выдаваемая через `/auth/login`.

## Общие зависимости
- `Depends(get_session_dependency)` — создаёт асинхронную сессию SQLAlchemy и
  пробрасывает её во все обработчики, где требуется доступ к PostgreSQL.
- `Depends(get_current_user)` — ищет действующую сессию: сначала в заголовке
  `Authorization: Bearer`, затем в cookie. Валидирует пользователя, кладёт
  объекты `auth_session` и `db_session` в `request.state`.
- `Depends(get_rate_limiter)` — выдаёт Redis-based rate limiter, который
  ограничивает число попыток логина по IP.
- `Depends(get_current_user_with_roles)` — расширяет `get_current_user`,
  возвращая набор ролей (`RoleName`) и флаг супер-пользователя из
  конфигурации (`ADMIN_SUPERUSERS`).
- `require_roles(...)` — фабрика зависимостей, которая проверяет, что текущий
  пользователь обладает хотя бы одной из указанных ролей; супер-пользователи
  обходят проверку независимо от записей в `user_roles`.

## System (`/healthz`)
| Метод и путь | Назначение | Тело запроса | Ответ | Требования |
| --- | --- | --- | --- | --- |
| `GET /healthz` | Проверка готовности сервиса. | — | `{ "status": "ok" }`. | Открытый доступ. |

## Auth (`/auth`)
| Метод и путь | Назначение | Тело запроса | Ответ | Требования |
| --- | --- | --- | --- | --- |
| `POST /auth/register` | Создать нового пользователя. | `RegisterRequest` (username, email, password). | `UserResponse`, HTTP 201. | Открытый доступ. |
| `POST /auth/login` | Аутентификация пользователя. | `LoginRequest` (identifier, password, optional device). | Для web: CSRF-токен и httpOnly-cookie сессии; для устройств: пара `access_token`/`refresh_token`. | Открытый доступ, лимитируется по IP. |
| `POST /auth/refresh` | Выдать новую пару токенов. | `RefreshRequest` (refresh_token, optional device_id). | `RefreshResponse` с новой парой токенов и временем жизни. | Требуется валидный refresh-токен. |
| `POST /auth/logout` | Завершить текущую сессию. | `LogoutRequest` (опционально refresh_token/device_id для десктопных устройств). | 204 No Content. Очищает cookie и отзывает запись в БД. | Требуется авторизация. |
| `GET /auth/me` | Получить данные текущего пользователя. | — | `UserResponse`. | Требуется авторизация. |

**Особенности авторизации:**
- `POST /auth/login` различает web-клиенты и внешние устройства. Для
  `DeviceKind.WEB` выдаётся httpOnly-cookie (`session_cookie_name`) и CSRF-токен
  в теле ответа; для других видов возвращается Bearer-пара access/refresh с
  идентификатором устройства.
- Все refresh-токены хешируются и сохраняются как `AuthSession` в БД. При
  подозрительных запросах с неправильным устройством сессия отзывается.
- CSRF для web-сессий проверяется в `POST /auth/logout`: клиент обязан
  передать заголовок `settings.csrf_header` со значением токена.
- Rate limiter на логине отвечает за Retry-After и HTTP 429, если превышен
  лимит попыток.

## Практические советы
- Документация OpenAPI доступна по `/docs`. Там же можно интерактивно проверить
  JSON-схемы `LoginResponse`, `RefreshResponse` и т.д.
- При ручном тестировании web-сессий не забывайте передавать cookie и CSRF; без
  них `logout` вернёт 403. Для устройств передавайте `Authorization: Bearer` с
  access-токеном.
- Redis обязателен для работы rate limiter'а и менеджера сессий. При отсутствии
  соединения все эндпоинты аутентификации начнут возвращать ошибки.

## Admin (`/admin`)
| Метод и путь | Назначение | Тело запроса | Ответ | Требования |
| --- | --- | --- | --- | --- |
| `GET /admin/users` | Пагинированный список пользователей с фильтрами по email/username, роли и блокировке. | Query-параметры: `page`, `page_size`, `q`, `role`, `blocked`, `sort_by`, `sort_order`. | `AdminUserListResponse` (items, total, page, page_size). | Роль `moderator` или `admin`, либо супер-пользователь. |
| `POST /admin/users/{id}/block` | Заблокировать пользователя и отозвать его сессии. | `BlockUserRequest` c необязательной причиной. | `AdminUser` с обновлённым состоянием. | Роль `admin` или супер-пользователь. |
| `POST /admin/users/{id}/unblock` | Снять блокировку. | `BlockUserRequest` (опциональная причина). | `AdminUser`. | Роль `admin` или супер-пользователь. |
| `POST /admin/users/{id}/roles` | Назначить или отозвать роли. | `RoleUpdateRequest` (`roles`, `mode` — `replace`/`add`/`remove`). | `AdminUser`. | Роль `admin` или супер-пользователь. |
| `GET /admin/rooms/active` | Заглушка для мониторинга активных комнат. | — | `{ rooms: [], total: 0, note: "TODO ..." }`. | Роль `moderator` или `admin`, либо супер-пользователь. |
| `GET /admin/calls/active` | Заглушка для мониторинга активных звонков. | — | `{ calls: [], total: 0, note: "TODO ..." }`. | Роль `moderator` или `admin`, либо супер-пользователь. |

**Особенности административного API:**
- Все действия логируются и записываются в `moderation_events`. Для блокировки
  автоматически выполняется ревокация активных HTTP/desktop-сессий через
  `SessionService`.
- Роль `user` назначается по умолчанию и не может быть удалена — сервис RBAC
  всегда возвращает её в итоговом списке.
- Заглушки `rooms/calls` возвращают пустые данные и комментарий `note`; они
  предназначены для будущей интеграции с задачей `api-rooms-calls`.