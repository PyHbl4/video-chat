# Доменные модели

Документ описывает основные ORM-сущности бэкенда видеочата и их взаимосвязи. Все модели унаследованы от `videochat_api.db.base.Base` и используют SQLAlchemy 2.x с асинхронными сессиями (`AsyncSession`). При расширении схемы поддерживайте единый стиль типизации и обновляйте Alembic-миграции.

## User (`videochat_api/models/user.py`)
| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `Integer`, PK, autoincrement | Уникальный идентификатор пользователя. |
| `username` | `String(50)`, unique, indexed | Публичный логин, используется для аутентификации и подписей в чате. |
| `email` | `String(255)`, unique, indexed | Почта для восстановления доступа и уведомлений. |
| `password_hash` | `String(255)` | Хэш пароля (bcrypt через `PasswordService`). |
| `is_blocked` | `Boolean`, default `false` | Флаг блокировки аккаунта; заблокированные пользователи не проходят аутентификацию. |
| `created_at` | `DateTime(timezone=True)` | Время регистрации. |
| `updated_at` | `DateTime(timezone=True)` | Автообновляемая отметка последнего изменения. |

**Связи:**
- `devices` — список устройств (`Device`), каскад `all, delete-orphan`.
- `sessions` — активные авторизационные сессии (`AuthSession`), каскад `all, delete-orphan`.

**Особенности:** при удалении пользователя каскадно удаляются связанные устройства и сессии, что предотвращает «висячие» refresh-токены.

## Device (`videochat_api/models/device.py`)
| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `Integer`, PK | Идентификатор устройства. |
| `user_id` | `Integer`, FK -> `users.id`, `ondelete="CASCADE"` | Владелец устройства. |
| `identifier` | `String(128)`, indexed | Стабильный идентификатор устройства (fingerprint/UUID). |
| `kind` | `Enum(DeviceKind)` | Тип клиента: web, desktop, tauri. |
| `display_name` | `String(100)` | Название, отображаемое в настройках профиля. |
| `user_agent` | `String(255)` | Последняя строка user-agent, помогает в отладке. |
| `refresh_token_hash` | `String(128)`, indexed | Хэш refresh-токена, выданного устройству. |
| `refresh_token_expires_at` | `DateTime(timezone=True)` | Срок действия refresh-токена. |
| `last_seen_at` | `DateTime(timezone=True)` | Последняя активность. |
| `created_at` | `DateTime(timezone=True)` | Дата регистрации устройства. |
| `updated_at` | `DateTime(timezone=True)` | Автообновляемая отметка изменения. |
| `revoked_at` | `DateTime(timezone=True)` | Дата отзыва устройства (аннулирования refresh-токена). |

**Связи:**
- `sessions` — авторизационные сессии, инициированные с этого устройства (`AuthSession`).
- `user` — обратная ссылка на владельца (`User`).

**Особенности:** Enum `DeviceKind` хранится в отдельном типе БД `device_kind`. При изменении значений не забывайте регенерировать миграцию, иначе PostgreSQL сохранит устаревший набор вариантов.

## AuthSession (`videochat_api/models/session.py`)
| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | `String(36)`, PK | UUID сессии (генерируется `uuid4`). |
| `user_id` | `Integer`, FK -> `users.id`, `ondelete="CASCADE"` | Владелец сессии. |
| `device_id` | `Integer`, FK -> `devices.id`, `ondelete="CASCADE"` | Привязанное устройство, может быть `NULL` для анонимных токенов. |
| `kind` | `Enum(SessionKind)` | Канал авторизации: web, desktop, tauri. |
| `session_token_hash` | `String(128)`, unique | Хэш cookie-токена (browser session). |
| `csrf_token` | `String(128)` | CSRF-токен для cookie-сессий. |
| `refresh_token_hash` | `String(128)`, unique | Хэш refresh-токена, выданного при логине. |
| `refresh_token_expires_at` | `DateTime(timezone=True)` | Дата истечения refresh-токена. |
| `expires_at` | `DateTime(timezone=True)` | TTL основной сессии. |
| `ip_address` | `String(45)` | Последний IP-клиента (IPv4/IPv6). |
| `user_agent` | `String(255)` | Последний user-agent обращения. |
| `created_at` | `DateTime(timezone=True)` | Дата создания сессии. |
| `last_seen_at` | `DateTime(timezone=True)` | Последняя активность. |
| `revoked_at` | `DateTime(timezone=True)` | Отзыв (принудительное завершение). |

**Связи:**
- `device` — опциональная ссылка на `Device`, обратная сторона `Device.sessions`.
- `user` — ссылка на владельца (`User.sessions`).

**Особенности:** значения Enum `SessionKind` синхронизируются с фронтендом и мобильными клиентами; не меняйте строки без согласования. Поля `session_token_hash` и `refresh_token_hash` уникальны, поэтому перед записью всегда используйте `SessionService.hash_token`, иначе получите конфликт.

## Перечисления
- `DeviceKind` (`videochat_api/models/device.py`) — типы клиентов. Расширяйте при добавлении новых платформ (например, mobile).
- `SessionKind` (`videochat_api/models/session.py`) — типы авторизационных каналов. Убедитесь, что соответствующие значения поддерживаются в сервисах аутентификации и в фронтендах.

## Схема связей
```
User 1<--->* Device 1<--->* AuthSession
  \______________________________^ (по полю user_id)
```
- Удаление пользователя приводит к каскадному удалению устройств и сессий.
- Удаление устройства удаляет связанные сессии, но не пользователя.
- Сессия может жить без устройства (`device_id = NULL`), например для одноразовых токенов.

## Дополнительные объекты
- Pydantic-схемы в `videochat_api/schemas/auth.py` описывают запросы/ответы (`RegisterRequest`, `LoginResponse` и т.д.). При изменении моделей синхронизируйте поля с соответствующими схемами.
- Хэширование и ревокация токенов реализованы в `videochat_api.auth.session.SessionService`; при добавлении новых полей обновляйте сервис и текущую документацию.

При создании новых сущностей придерживайтесь подхода: модель → миграция → схема → сервисы → обновление документации. Это гарантирует согласованность контрактов и предотвращает рассинхронизацию данных.