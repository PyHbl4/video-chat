---
title: "Web: Друзья и presence"
status: in-progress
assignee: "codex"
priority: high
eta: 2025-10-19
tags: [frontend, web, stage2]
links: ["docs/codex/WEB-CLIENT-TODO.md", "docs/codex/SIGNALING-WEBRTC-TODO.md"]
---

## Контекст

Stage 2 требует экран `/app` со списком друзей, статусами online/offline и действиями над заявками. Клиент должен слушать socket.io события от API и синхронизировать состояние.

## Что сделать

- [ ] Создать layout `/app` (navbar/sidebar, список друзей) с состояниями loading/empty.
  - [ ] Выделить общие компоненты (SidebarShell, FriendListItem, PresenceDot) и описать контракт пропсов.
  - [ ] Протянуть данные из временного стора (zustand) и предусмотреть skeleton-загрузку.
- [ ] Интегрировать socket.io-client с auth (cookie/JWT) и подписками на `presence:update`, `friends:*`.
  - [ ] Настроить клиент `@video-chat/web-auth` для выдачи accessToken socket.io.
  - [ ] Добавить слой уведомлений/очередь событий, обработку reconnect/backoff.
- [ ] Реализовать поиск (`GET /users/search`), отправку/принятие/отклонение заявок, фильтры online/offline.
  - [ ] Согласовать UX поиска (debounce, пустые состояния) и optimistic update заявок.
  - [ ] Синхронизировать фильтр онлайн с realtime событиями.
- [ ] Добавить unit + e2e тесты на быстрые сценарии (отправка заявки, обновление статуса в реальном времени).
  - [ ] Покрыть стор и hook-и тестами на редьюсеры и optimistic update.
  - [ ] Поднять smoke e2e для happy path: отправка заявки, подтверждение, обновление статуса.

## Заметки

Использовать shadcn компоненты (Badge, ScrollArea). Настроить optimistic UI с откатом при ошибках API. Для socket-событий
нужен стор-буфер, чтобы сохранять порядок и не потерять апдейты при быстром reconnect.

## История выполнения

2025-10-06 — задача взята в работу, составлен план подзадач и уточнены точки интеграции с web-auth/socket.io.
