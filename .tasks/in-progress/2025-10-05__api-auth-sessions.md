---
title: "API: Persist sessions and refresh lifecycle"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [api, auth, stage1]
links: ["docs/codex/API-SPEC-TODO.md"]
---

## Контекст

Сейчас backend авторизации хранит только подписанный cookie через `SessionManager`; нет устройств, refresh-токенов и механизма отзыва. Это не соответствует требованиям Stage 1 и OpenAPI (desktop должен получать JWT + refresh). Нужно перейти на устойчивое хранение сессий/устройств и покрыть сценарии входа/выхода.

## Что сделать

- [ ] Добавить модели и Alembic-миграции для `devices` и `sessions`/refresh-токенов согласно `API-SPEC-TODO.md`.
- [ ] Обновить эндпоинты `/auth/register`, `/auth/login`, `/auth/logout`, реализовать `/auth/refresh` с ротацией refresh-токена.
- [ ] Настроить куки для web (httpOnly, SameSite) и выдачу access/refresh JWT для desktop (в ответах) с конфигурируемыми таймерами.
- [ ] Добавить отзыв refresh-токенов при logout и блокировке пользователя, учесть множественные устройства.
- [ ] Обновить OpenAPI и pydantic-схемы, добавить юнит/интеграционные тесты на happy-path и отзыв сессий.

## Заметки

Учесть rate-limit и CSRF-заголовок. Для JWT использовать signing secret из `settings`, предусмотреть clock skew < 30 сек.

## История выполнения

Еще не выполнялась.
