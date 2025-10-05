# Self‑Hosted Video Chat — Codex Brief (Master)

**Updated:** 2025-10-04 17:39 UTC

Этот документ — главный вход для агента **GPT‑5‑codex‑high**.  
Цель: разработать self‑hosted видео‑чат (браузер + desktop оболочка), с авторизацией, друзьями, 1:1 и малые групповые звонки (**WebRTC mesh**), собственным сигналингом, STUN/TURN и минимальной админкой. Стек и требования согласованы с владельцем проекта.

## Общие правила для Codex

- Работай итерациями по стадийному плану (см. `STAGE-PLAN.md`). На каждой стадии — делай PR/коммит с чёткой структурой, следуй чеклистам приёмки.
- Не придумывай неподтверждённые контракты: **истина — в `packages/contracts/openapi.yaml`**. Если файла нет — создай минимальную версию, обновляй по мере добавления фич, и **генерируй типы** (TS и Python) согласно `STAGE-PLAN.md`.
- Обязательно прикладывай **инструкции запуска** в `docs/RUNBOOK.md` и поправляй их по мере изменения инфраструктуры.
- Следуй требованию **privacy by default**: не логируй содержимое медиа, только метаданные звонков.
- Линт, формат, typecheck не должны падать. Уважай кэш **Turborepo**.

## Технический контур

- **Frontend**: React + Next.js 15 (app router) + TS + shadcn/ui + socket.io-client.
- **Admin**: Next.js (минимальные функции: пользователи, блокировки, роли).
- **API**: Python/FastAPI + PostgreSQL + SQLAlchemy + Redis + python-socketio.
- **WebRTC**: Mesh P2P (2–6 участников) с собственным STUN/TURN (**coturn**), ICE‑креды краткоживущие.
- **Infra**: Docker Compose (dev/prod), nginx, coturn (TLS/443, TCP fallback).
- **Auth**: логин/пароль, cookie‑сессии в вебе + JWT для desktop. Пароли — Argon2id. Rate‑limit на логин/пароль через Redis.
- **Desktop (после MVP)**: Tauri‑оболочка над web‑клиентом.

## Директории монорепы (целевое состояние)

```
self-hosted-videochat/
  apps/
    web/        # Next.js клиент
    admin/      # Next.js админка
    api/        # FastAPI
  packages/
    ui/         # shadcn-компоненты
    shared/     # общие TS утилиты/типы
    contracts/  # openapi.yaml + генерация TS/Python моделей
  infra/
    docker/     # compose.*.yml, Dockerfile.*, postgres-init.sql
    turn/       # coturn конфиги и скрипты
    nginx/      # reverse proxy
  env/          # *.env.example
  scripts/      # bootstrap, helpers
  docs/         # ARCHITECTURE.md, RUNBOOK.md, SECURITY.md, ROADMAP.md
```

## Документы

- `STAGE-PLAN.md` — подробные этапы и артефакты.
- `API-SPEC-TODO.md` — требования к REST/WS API, БД.
- `WEB-CLIENT-TODO.md` — требования к веб‑клиенту.
- `SIGNALING-WEBRTC-TODO.md` — сигналинг, ICE, TURN.
- `INFRA-DEVOPS.md` — Docker/nginx/coturn и окружения.
- `ACCEPTANCE-CHECKLIST.md` — чеклист приёмки для каждой стадии.
