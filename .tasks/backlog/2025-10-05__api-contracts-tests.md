---
title: "API: OpenAPI синхронизация и тестовый пайплайн"
status: backlog
assignee: "codex"
priority: medium
eta: null
tags: [api, contracts, qa]
links: ["docs/codex/README.md", "docs/codex/STAGE-PLAN.md"]
---

## Контекст

OpenAPI-спецификация уже описывает больше эндпоинтов, чем реализовано, и требует генерации TS/Python клиентов согласно стадии. Нужна автоматизация синхронизации контрактов и прогон тестов (lint/typecheck) перед релизами.

## Что сделать

- [ ] Актуализировать `packages/contracts/openapi.yaml` под реализованные/планируемые фичи (auth, friends, rooms, webrtc).
- [ ] Настроить генерацию типов (TS/ Python) и публикацию артефактов (`pnpm generate`, wheel) в CI/Turborepo.
- [ ] Добавить smoke/integration тесты FastAPI (pytest + httpx) и включить их в `turbo test`.
- [ ] Описать требования запуска в `docs/RUNBOOK.md`, обновить чеклисты.

## Заметки

Подготовить фикстуры для Redis/Postgres через тестовые контейнеры или sqlite in-memory (для unit).

## История выполнения

Еще не выполнялась.
