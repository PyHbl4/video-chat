# Self Prompt: Room Join 500 Fix

## Цель
Исправить ошибку 500 при вызове `POST /rooms/{room_id}/join`, чтобы приглашённый пользователь мог успешно присоединяться к комнате и переводить её статус в `active` без внутренних ошибок сервера.

## Контекст
- FastAPI-приложение обслуживает комнаты через модуль `videochat_api.api.endpoints.rooms`, где все ответы сериализуются функцией `_model_to_schema`. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L17-L198】
- SQLAlchemy-модели комнат и участников хранят enum-поля `status` и `role`, сопоставленные с PostgreSQL Enum при работе в боевом окружении. 【F:apps/api/videochat_api/models/room.py†L12-L82】
- README и AGENTS подчёркивают ручную проверку комнат через Swagger и необходимость корректно обрабатывать статусы комнаты/участников. 【F:apps/api/README.md†L84-L170】【F:apps/api/AGENTS.md†L35-L83】
- Знание-база описывает жизненный цикл комнаты: `join_room` переводит комнату в `active` и должен быть идемпотентным. 【F:apps/api/knowledge/rooms.md†L1-L80】

## Проблема
- При работе с PostgreSQL SQLAlchemy возвращает строковые значения enum-полей (`"active"`, `"guest"`).
- `_model_to_schema` безусловно обращается к атрибуту `.value` у `Room.status` и `RoomParticipant.role`. Если вместо Enum приходит строка, возникает `AttributeError: 'str' object has no attribute 'value'`, FastAPI преобразует его в ответ 500. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L34-L70】
- Swagger-проверка из README рушится на шаге присоединения, поэтому второй пользователь не может войти в комнату.

## Предлагаемое решение
1. Изменить `_model_to_schema`, чтобы аккуратно преобразовывать как enum-значения, так и строки (например, через вспомогательную функцию `to_enum_value`).
2. Перевести сериализацию участников на Pydantic-схемы без прямого обращения к `.value`, используя `RoomParticipantRoleSchema(part.role)`/`RoomStatusSchema(room_model.status)` после нормализации.
3. Добавить pytest-кейс, моделирующий ситуацию с сырыми строками (можно подменить `Room.status` и `RoomParticipant.role` на строковые значения перед вызовом `_model_to_schema`).
4. Убедиться, что Socket.IO-события продолжают отправляться без изменений payload.
5. При необходимости дополнить документацию/knowledge напоминанием о различиях типов enum в PostgreSQL.

## Проверка
- Запустить `pytest` для подтверждения прохождения существующих и новых тестов.
- Ручная проверка через Swagger по инструкции из README: создать комнату, выполнить `POST /rooms/{room_id}/join`, убедиться в ответе 200 и статусе `active`.

## Риски и открытые вопросы
- Нужно удостовериться, что подобная логика сериализации применяется ко всем эндпоинтам комнат; иначе стоит вынести нормализацию в отдельный helper.
- Проверить, что изменения не нарушат работу кэша Redis и подписчиков Socket.IO, так как payload остаётся в прежнем формате.
