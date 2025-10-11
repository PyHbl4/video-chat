---
title: "Web: Друзья и presence"
status: review-ready
assignee: "codex"
priority: high
eta: 2025-10-19
tags: [frontend, web, stage2]
links: ["docs/codex/WEB-CLIENT-TODO.md", "docs/codex/SIGNALING-WEBRTC-TODO.md"]
---

## Контекст

Stage 2 требует экран `/app` со списком друзей, статусами online/offline и действиями над заявками. Клиент должен слушать socket.io события от API и синхронизировать состояние.

## Что сделано

- [x] Создан layout `/app` с сайдбаром, поиском и списком друзей, реализованы состояния загрузки/пустоты.
- [x] Выделены компоненты `AppShell`, `FriendListItem`, `PresenceDot`, `FriendsSidebar` и стор на Zustand.
- [x] Протянуты данные из REST-клиента и настроен skeleton на первичную загрузку.
- [x] Интегрирован `socket.io-client` с токенами из `@video-chat/web-auth`, добавлены подписки на `presence:update`, `friends:*` и очередь уведомлений.
- [x] Реализованы поиск, отправка/принятие/отклонение заявок, фильтр online/offline с синхронизацией realtime.
- [x] Добавлены unit-тесты стора (Vitest) и smoke-уведомления через sonner; e2e пока не запускались (нужен backend с сокетами).

## Заметки

- Кнопка «Позвонить» пока показывает заглушку — заменим, когда появится звонковый UX.
- Для e2e потребуется поднятое API со стабильными socket.io событиями; тесты будут добавлены вместе с глобальным e2e-пакетом.

## История выполнения

- 2025-10-06 — реализован UI друзей, realtime presence, стор и документация; задача готова к ревью.
