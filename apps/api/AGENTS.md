# Video Chat API – Agent Guide

## Краткое описание
Сервис реализован на FastAPI и отвечает за регистрацию пользователей, cookie- и JWT-аутентификацию, управление дружбой и присутствием, а также за выдачу поисковых результатов. Реализация объединяет REST-эндпоинты и Socket.IO-шлюз в одном приложении. 【F:apps/api/videochat_api/main.py†L30-L62】【F:apps/api/videochat_api/api/endpoints/auth.py†L31-L263】【F:apps/api/videochat_api/api/endpoints/friends.py†L61-L223】

## Архитектура и жизненный цикл
- Точка входа `videochat_api.main` создаёт экземпляр FastAPI, подключает роутеры и привязывает Socket.IO-сервер. Лайфспан открывает соединения с БД и Redis и закрывает их на остановке. 【F:apps/api/videochat_api/main.py†L17-L52】
- Зависящие компоненты (сессии, rate limiter, PresenceService) поставляются через зависимостный контейнер FastAPI. Redis недоступен — rate limiter и presence переходят в деградационный режим. 【F:apps/api/videochat_api/dependencies.py†L21-L97】【F:apps/api/videochat_api/services/presence.py†L16-L94】
- WebSocket-обработчик авторизует клиента по JWT либо cookie+CSRF, синхронизирует онлайн-статус и уведомляет друзей. 【F:apps/api/videochat_api/websocket/server.py†L53-L218】

## Запуск и инфраструктура
1. Требования: Python 3.11, PostgreSQL (совместимый с `DATABASE_URL`), Redis (совместимый с `REDIS_URL`). 【F:apps/api/videochat_api/config.py†L12-L25】
2. Установка: `pip install -e .[dev]` из каталога `apps/api`.
3. Миграции: `alembic upgrade head` (используются версии в `alembic/versions`). 【F:apps/api/alembic/versions/20240912_000001_create_users_table.py†L1-L20】
4. Локальный сервер: `uvicorn videochat_api.main:app --reload`. 【F:apps/api/videochat_api/main.py†L55-L62】
5. Тесты: `pytest` (охватывают аутентификацию, дружбу, поиск). 【F:apps/api/tests/test_auth.py†L7-L83】【F:apps/api/tests/test_friends.py†L1-L129】【F:apps/api/tests/test_users.py†L1-L54】

## Особенности и предупреждения
- Все маршруты, кроме `/healthz`, требуют активной сессии. Для web-клиентов необходимо прокидывать CSRF-заголовок при logout и действиях с дружбой. 【F:apps/api/videochat_api/api/endpoints/auth.py†L217-L259】【F:apps/api/videochat_api/dependencies.py†L72-L97】
- Ротация refresh-токенов обязательна: повторное использование старого токена приводит к 401 и блокировке сессии. 【F:apps/api/videochat_api/api/endpoints/auth.py†L201-L214】
- Redis используется сразу в нескольких сценариях (rate limiting, presence). При недоступности стоит ожидать повышенные нагрузки и отсутствие статуса онлайн. 【F:apps/api/videochat_api/dependencies.py†L25-L44】【F:apps/api/videochat_api/services/presence.py†L16-L94】
- При изменении моделей не забудьте обновить миграции и синхронизировать Pydantic-схемы. 【F:apps/api/videochat_api/models/user.py†L1-L34】【F:apps/api/videochat_api/schemas/__init__.py†L1-L24】
