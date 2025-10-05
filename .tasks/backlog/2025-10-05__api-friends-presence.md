---
title: "API: Friends, requests и presence"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [api, stage2, websocket]
links: ["docs/codex/API-SPEC-TODO.md", "docs/codex/SIGNALING-WEBRTC-TODO.md"]
---

## Контекст

В Stage 2 требуется дружба и presence: таблица `friends`, REST API для запросов/акцепта, а также online-статусы через Redis + socket.io. Сейчас в API нет ни моделей, ни WS-событий.

## Что сделать

- [ ] Добавить модели и миграцию для `friends` (статусы requested/accepted/blocked) и сервис слой для проверок взаимности.
- [ ] Реализовать эндпоинты `/friends/request`, `/friends/accept`, `/friends/decline`, `/friends` и поиск `/users/search`.
- [ ] Настроить Redis presence: хранение последней активности, TTL, отдельные каналы socket.io `presence:update`.
- [ ] Реализовать socket.io namespacing (`user:{id}`) и события при изменении дружбы/онлайн-статуса.
- [ ] Покрыть тестами REST и базовый WS-флоу (например, через `async_client` + fake Redis).

## Заметки

Учесть rate-limit отправки заявок и проверку блокировок. БД индексы: `(user_id, status)`, `(friend_id, status)`.

## История выполнения

Еще не выполнялась.
