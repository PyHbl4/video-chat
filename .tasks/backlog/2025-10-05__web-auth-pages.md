---
title: "Web: Страницы логина и регистрации"
status: backlog
assignee: "codex"
priority: high
eta: null
tags: [frontend, web, stage1]
links: ["docs/codex/WEB-CLIENT-TODO.md"]
---

## Контекст

Для завершения Stage 1 на фронте нужны страницы `/auth/login` и `/auth/register` с формой, валидацией и UX (ошибки, блокировки). Сейчас фронт — только заглушка.

## Что сделать

- [ ] Создать маршруты `/auth/login` и `/auth/register` (app router), подключить shadcn формы, yup/zod схемы.
- [ ] Добавить отправку запросов к API (fetch или сгенерированный клиент) с обработкой состояний и rate-limit ошибок.
- [ ] После логина — обновлять SessionProvider, редиректить в `/app`.
- [ ] Покрыть компонентные тесты (React Testing Library) и e2e happy-path «регистрация → логин → профиль».

## Заметки

Нужны подсказки для требований пароля и презентуемые ошибки API (403 blocked, 429 rate-limit).

## История выполнения

Еще не выполнялась.
