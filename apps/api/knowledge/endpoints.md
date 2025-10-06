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