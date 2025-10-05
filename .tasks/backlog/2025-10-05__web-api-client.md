---
title: "Web: API client и session контекст"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [frontend, web, stage1]
links: ["docs/codex/WEB-CLIENT-TODO.md", "packages/contracts/openapi.yaml"]
---

## Контекст

Next.js клиент пока отображает заглушку. Нужно подключить сгенерированный REST-клиент и обеспечить хранение сессии (cookie + csrf), чтобы дальше строить auth и основное приложение.

## Что сделать

- [ ] Интегрировать TS-клиент из `packages/contracts` (или временный fetch слой) с обработкой ошибок и повторов.
- [ ] Реализовать общий `SessionProvider` (React context + server actions) для чтения `/me`, хранения csrf и состояния загрузки.
- [ ] Настроить базовую инфраструктуру (env, конфиг api baseUrl, interceptors для refresh).
- [ ] Добавить e2e smoke (Playwright или Cypress) на проверку, что редиректит на `/auth/login` без сессии.

## Заметки

Использовать app router и server actions, хранить csrf в `httpOnly` => нужно проксировать через API route.

## История выполнения

Еще не выполнялась.
