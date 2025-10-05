---
title: "Web: Друзья и presence"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [frontend, web, stage2]
links: ["docs/codex/WEB-CLIENT-TODO.md", "docs/codex/SIGNALING-WEBRTC-TODO.md"]
---

## Контекст

Stage 2 требует экран `/app` со списком друзей, статусами online/offline и действиями над заявками. Клиент должен слушать socket.io события от API и синхронизировать состояние.

## Что сделать

- [ ] Создать layout `/app` (navbar/sidebar, список друзей) с состояниями loading/empty.
- [ ] Интегрировать socket.io-client с auth (cookie/JWT) и подписками на `presence:update`, `friends:*`.
- [ ] Реализовать поиск (`GET /users/search`), отправку/принятие/отклонение заявок, фильтры online/offline.
- [ ] Добавить unit + e2e тесты на быстрые сценарии (отправка заявки, обновление статуса в реальном времени).

## Заметки

Использовать shadcn компоненты (Badge, ScrollArea). Настроить optimistic UI с откатом при ошибках API.

## История выполнения

Еще не выполнялась.
