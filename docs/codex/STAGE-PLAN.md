# STAGE PLAN — Пошаговый план разработки

> Старайся укладываться в 1–2 рабочих сессии Codex на стадию. Каждая стадия завершается рабочим запуском `pnpm dev` или `docker compose up` и чеклистом приёмки.

## Stage 0 — Bootstrap монорепы

**Артефакты:**

- `pnpm-workspace.yaml`, `turbo.json`, корневой `package.json` (скрипты dev/build/lint/typecheck).
- Пустые `apps/web`, `apps/admin`, `apps/api`.
- `packages/contracts/openapi.yaml` (минимум: auth, users).
- `infra/docker/docker-compose.dev.yml` (db, redis, api, web, admin, coturn), `postgres-init.sql`.
- `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md` (первичная версия).

**Чеклист:**

- `pnpm dev` поднимает web/admin, API можно поднять через compose. DB и Redis доступны. Линтеры проходят.

---

## Stage 1 — Auth & Users

**Артефакты:**

- БД: Users, Password hashes (Argon2id), Sessions/RefreshTokens, Devices.
- API: регистрация, логин (cookie для веба), refresh‑JWT для desktop, logout, me.
- Rate‑limit на логин/регистрацию через Redis.
- UI (web/admin): формы логина/регистрации, профиль пользователя.

**Чеклист:**

- Вход/выход работает, cookie защищены (httpOnly, SameSite), пароли хэшируются, брутфорс ограничен.

---

## Stage 2 — Friends & Presence

**Артефакты:**

- БД: Friends, статус дружбы; Redis presence.
- API/WS: отправить/принять/отклонить дружбу; онлайн‑статусы через socket.io.
- UI: список друзей, фильтры онлайн/оффлайн, действия над заявками.

**Чеклист:**

- Реальное обновление presence, заявка/акцепт/блок корректны.

---

## Stage 3 — Сигналинг и 1:1 звонок (WebRTC Mesh)

**Артефакты:**

- WS события: `call:invite`, `call:ring`, `call:accept/decline`, `webrtc:offer/answer/candidate`, `call:end`.
- API endpoint для получения ICE‑конфига (STUN/TURN с краткоживущими кредами).
- UI: экран звонка, mute/unmute, выбор устройств, мини‑чат.

**Чеклист:**

- Два браузера на разных сетях могут созвониться через TURN (TCP/TLS) при жёсткой сети.

---

## Stage 4 — Групповой звонок (до 4–6 участников, Mesh)

**Артефакты:**

- БД: Rooms, RoomMembers, Calls.
- WS: вход/выход в комнату, пересылка SDP/ICE всем участникам.
- UI: участники в гриде, управление микрофоном/камерой, индикатор голоса, текстовый чат.

**Чеклист:**

- 3–4 участника устойчиво подключаются; деградация качества при слабой сети происходит плавно.

---

## Stage 5 — Админка и модерация

**Артефакты:**

- Admin pages: список пользователей, блокировки/разблокировки, просмотр активных комнат/звонков.
- RBAC роли: user, moderator, admin.

**Чеклист:**

- Блокированный пользователь не может логиниться/звонить.

---

## Stage 6 — Desktop (Tauri оболочка)

**Артефакты:**

- Обёртка Tauri, автологин по refresh‑JWT, системные уведомления о входящем звонке.
- Инсталляторы для macOS/Windows (артефакты сборки).

**Чеклист:**

- Кроссплатформенные билды собираются, звонок работает как в браузере.

---

## Stage 7 — Prod‑укладка

**Артефакты:**

- `docker-compose.prod.yml`, Dockerfile’ы, nginx конфиг, coturn TLS:443 с TCP fallback.
- Метрики/логи (минимум health‑endpoints и базовые nginx/coturn логи).

**Чеклист:**

- Чистый запуск на VDS по инструкции `docs/RUNBOOK.md`.
