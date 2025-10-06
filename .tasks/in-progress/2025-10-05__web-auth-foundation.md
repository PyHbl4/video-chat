---
title: "Web: Auth foundation (client + pages)"
status: in-progress
assignee: "codex"
priority: high
eta: null
tags: [frontend, web, stage1]
links: ["docs/codex/WEB-CLIENT-TODO.md", "packages/contracts/openapi.yaml"]
---

## Контекст

Бэкенд авторизации готов. Чтобы разблокировать развитие фронтенда, нужно одновременно внедрить клиент для общения с API и реализовать базовые auth-страницы, использующие этот клиент и сессионный контекст.

## Что сделать

- [ ] Сгенерировать и подключить TypeScript-клиент (`packages/contracts`) с обработкой ошибок, refresh-потоком и конфигурацией baseUrl.
- [ ] Реализовать `SessionProvider` (app router + server actions) для получения `/me`, хранения csrf и состояния авторизации.
- [ ] Добавить инфраструктуру env/config, прокси для httpOnly cookie и interceptors обновления токена.
- [ ] Создать страницы `/auth/login` и `/auth/register` с формами, валидацией и UX-сценариями ошибок.
- [ ] Интегрировать формы с SessionProvider, обновление состояния после логина и редирект в `/app`.
- [ ] Покрыть smoke e2e на редирект без сессии и happy-path «регистрация → логин → профиль».

## Заметки

Сгенерированные контракты пока отсутствуют — включить их генерацию в задачу. Обязательно покрыть сценарии rate-limit и блокировок.

## История выполнения

- 2025-10-05: Задача создана как объединение `web-api-client` и `web-auth-pages`.
