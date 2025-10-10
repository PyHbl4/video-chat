---
title: "Пакет web-auth"
summary: "Клиент аутентификации Next.js: сессия, формы и работа с API"
updated: 2025-10-05
owners: ["codex"]
tags: ["frontend", "auth", "nextjs"]
related: [
  "docs/codex/WEB-CLIENT-TODO.md",
  "packages/web-auth/src/components/session-provider.tsx",
  "packages/web-auth/src/auth/actions.ts"
]
---

## Назначение

`@video-chat/web-auth` инкапсулирует работу с пользовательской сессией в приложениях `apps/web` и `apps/admin`. Пакет создаёт клиент для REST API авторизации, управляет cookie (csrf/access/refresh), отдаёт контекст сессии и предоставляет серверные действия для логина, регистрации и выхода.

## Точки входа

- `SessionProvider` — обёртка для App Router, подключается в `apps/web/app/layout.tsx` и `apps/admin/app/layout.tsx`. Провайдер принимает `initialSession` из серверного рендера и держит снимок сессии в клиентском состоянии. Для принудительного обновления предусмотрен метод `refresh()` (вызов `/api/session`).
- `useSession` — хук для компонентов, возвращает актуальную сессию и функции `refresh`/`setSession`.
- Серверные экшены `loginAction`, `registerAction`, `logoutAction` — используются на страницах `/auth/login`, `/auth/register`, а также в UI выхода.

## Основные зависимости

- REST-клиент из `@video-chat/contracts`: генерируется по `openapi.yaml` и используется для вызова `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/me`.
- Next.js `app` router: серверные экшены, провайдер сессии и доступ к `cookies()` / `headers()`.
- `@video-chat/ui`: формы авторизации и уведомления собираются на его компонентах.

## Ключевые модули

- `src/env.ts` — нормализует `WEB_API_BASE_URL` (сервер) и `NEXT_PUBLIC_API_BASE_URL` (клиент), объявляет имена cookie (`vc.csrf-token`, `vc.access-token`, `vc.refresh-token`).
- `src/api/server.ts` — создаёт `ApiClient` с прокидыванием cookie и заголовков `x-forwarded-for`/`user-agent`, а также отдаёт CSRF-токен из cookie.
- `src/session/server.ts` — формирует стартовый снимок сессии: читает CSRF из cookie, делает `auth.me()` и возвращает пользователя или ошибку.
- `src/components/session-provider.tsx` — React-контекст, хранит `SessionSnapshot`, обновляется по `initialSession` и умеет обновлять состояние через `/api/session`.
- `src/auth/actions.ts` — серверные экшены: валидация форм, вызов API, обработка `ApiError`, установка cookie (через `applyResponseCookies`) и сбор нового `SessionSnapshot`.
- `src/hooks/use-session.ts` — клиентский доступ к контексту (обёртка над `SessionProvider`).

## Потоки данных / основная логика

1. Серверный рендер вызывает `getInitialSession()` (например, из `layout.tsx`). Функция берёт CSRF-токен из cookie, затем делает запрос `auth.me()`. При 401 возвращает гостевую сессию, при других ошибках — помечает состояние `error` для дальнейшей диагностики.
2. На странице логина `loginAction` проверяет поля формы, вызывает `auth.login()` и, получив `set-cookie`, сохраняет токены и CSRF. Затем экшен собирает новый `SessionSnapshot` (с установленными токенами и `fetchedAt`) и отдаёт его клиенту.
3. Компонент `SessionProvider` на клиенте получает успешный результат `loginAction`, вызывает `setSession()` и делает редирект на `/app`. При последующих обновлениях можно дернуть `refresh()` — он обращается к `/api/session`, который проксирует `getInitialSession()`.
4. `registerAction` валидирует email/username/password, вызывает `auth.register()` и возвращает статус; при успехе не логинит автоматически, UI предлагает войти вручную.
5. `logoutAction` дергает `auth.logout()`, удаляет csrf-cookie и возвращает пустую сессию (используется в меню пользователя).

## Конфигурация

- `WEB_API_BASE_URL` — базовый URL API на сервере Next.js (используется в edge/server action).
- `NEXT_PUBLIC_API_BASE_URL` — клиентский URL для `fetch` в браузере; по умолчанию наследует серверное значение.
- Флаг `WEB_AUTH_DEBUG=1` включает расширенный лог сервера (через `server/debug-logger.ts`), добавляет отладочную информацию о запросах/ответах login.

## Диагностика и отладка

- Включите `WEB_AUTH_DEBUG=1` в `env/web.env.local` и перезапустите `pnpm dev`, чтобы получать подробные логи (`authDebug`) о выполнении `loginAction` и управлении cookie.
- Для проверки актуальности сессии используйте эндпоинт `/api/session` (оборачивается в route handler в `apps/web`), который возвращает `SessionSnapshot` и помогает выявлять проблемы с токенами.
- Неожиданные исключения в экшенах логируются через `console.error` и возвращают пользователю дружелюбное сообщение; проверяйте логи Vercel/Next.js при расследовании.

## Точки расширения

- Добавление MFA или восстановления пароля: расширяйте `auth/actions.ts`, переиспользуя `mergeFieldErrors` и обработку `ApiError`.
- Для интеграции с socket.io можно использовать `setSession()` в реакциях на события (например, обновление профиля), чтобы актуализировать токены/пользователя.
- При появлении refresh-флоу на клиенте добавьте вызовы `refresh()` в interceptor `fetch`, сохраняя семантику `SessionProvider`.

## Открытые вопросы

- Смоук-тесты e2e для auth пока не реализованы; задачу планируем закрыть совместно с другими е2e сценариями Stage 1.
