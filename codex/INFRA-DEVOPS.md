# INFRA & DEVOPS

## Docker (dev)

- Сервисы: postgres, redis, api (uvicorn), web (Next dev), admin, coturn (dev-режим), nginx (опц.).
- Объединённая сеть, проброс портов: 3000 (web), 3100 (admin), 8000 (api), 5432 (db), 6379 (redis), 3478 (turn).

## Docker (prod)

- Раздельные Dockerfile для web/admin (Next build → nginx), api (python:slim), coturn, nginx reverse proxy.
- `docker-compose.prod.yml` со сборкой образов и разделением томов для БД/логов.

## Nginx

- Терминация TLS, прокси на web/admin/api.
- Порт‑шаринг TLS 443 с TURN (через отдельное имя/поддомен или SNI).

## Secrets & Env

- `.env.example` для web/admin/api/turn.
- Приватные секреты только в менеджере секретов/CI. В репо — шаблоны.

## RUNBOOK

- Документ с пошаговым запуском dev/prod, миграциями БД (Alembic), управлением пользователями-админами.
