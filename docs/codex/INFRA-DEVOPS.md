# INFRA & DEVOPS

## Docker (dev)

- Сервисы: postgres, redis, api (uvicorn), web (Next dev), admin, coturn (dev-режим), nginx (опц.).
- Объединённая сеть, проброс портов: 3000 (web), 3100 (admin), 8000 (api), 5432 (db), 6379 (redis), 3478 (turn).
- TURN dev-сервис использует `coturn/coturn:4.6.2` с минимальным набором флагов, чтобы стабильно запускаться в Docker Desktop на macOS.

### TURN (dev)

- В dev-compose запускаем `turnserver -n --log-file=stdout --listening-port=3478 --min-port=49160 --max-port=49200 --fingerprint --lt-cred-mech --realm=video.local --user=dev:dev` и полагаемся на дефолтные ограничения coturn. Флаги `--no-loopback-peers` и `--no-multicast-peers` отключены, потому что в dev образе 4.6.2 они не поддерживаются.
- В dev окружении держим простой UDP/TCP 3478 и диапазон UDP 49160-49200, статичные креды `dev:dev`, TLS не включён.
- В prod вернём расширенный набор флагов (loopback/multicast блок, auth-secret), перейдём на TLS 443 с TCP fallback и краткоживущими cred-secret.

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
