---
title: "API: Групповые комнаты, звонки и чат"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [api, stage4, webrtc]
links: ["docs/codex/API-SPEC-TODO.md", "docs/codex/SIGNALING-WEBRTC-TODO.md"]
---

## Контекст

Для Stage 4 нужны сущности комнат и активных звонков (до 6 участников), с расширением сигналинга и текстовым чатом. Backend пока имеет только модель `User` и нет комнат/сообщений.

## Что сделать

- [ ] Добавить модели и миграции `rooms`, `room_members`, `calls`, `messages`, продумать индексы и каскадное удаление.
- [ ] Реализовать REST: `/rooms`, `/rooms/:id` (GET), `/rooms/:id/join`, `/rooms/:id/leave`, `/rooms/:id/messages` (GET/POST) с пагинацией.
- [ ] Расширить socket.io события для групповых звонков (ретрансляция SDP/ICE всем участникам, `room:join`, `room:leave`, `chat:message`).
- [ ] Добавить контроль ролей в комнатах (owner/moderator/member) и ограничения на приглашения.
- [ ] Покрыть тестами жизненный цикл комнаты и чат (в т.ч. конкурирующие join/leave).

## Заметки

Продумать хранение истории сообщений (limit, retention), audit для модерации.

## История выполнения

Еще не выполнялась.
