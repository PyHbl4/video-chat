---
title: "API: Сигналинг 1:1 и ICE выдача"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [api, stage3, webrtc]
links: ["docs/codex/SIGNALING-WEBRTC-TODO.md"]
---

## Контекст

Для Stage 3 нужен полноценный сигналинг для 1:1 звонка и endpoint с краткоживущими STUN/TURN кредами. Сейчас socket.io сервер только логирует connect/disconnect; ICE-конфиг отсутствует.

## Что сделать

- [ ] Спроектировать модель звонка (in-memory или Redis) и события `call:invite`, `call:ring`, `call:accept/decline`, `call:end`, `webrtc:offer/answer/candidate`.
- [ ] Добавить авторизацию socket.io (cookie/JWT), маршрутизацию в personal rooms `user:{id}` и обработку перезаподключений.
- [ ] Реализовать REST `GET /webrtc/ice-config`, интегрировать с coturn (генерация log-term creds, TTL 60–120 секунд).
- [ ] Обеспечить rate-limit и валидацию payload (Pydantic схемы) для WS/REST, логировать state-machine переходы.
- [ ] Написать интеграционные тесты на happy-path (звонок двух пользователей) с заглушками TURN.

## Заметки

Используем Redis для хранения активных звонков и locking; предусмотреть отмену приглашения.

## История выполнения

Еще не выполнялась.
