---
title: "Web `/app`: список друзей и presence"
summary: "Как устроены стор, realtime и UI для друзей в веб-клиенте"
updated: 2025-10-06
owners: ["codex"]
tags: ["web", "frontend", "friends"]
related: [
  "../../apps/web/app/app/page.tsx",
  "../../apps/web/components/app/friends-app-page.tsx",
  "../../apps/web/stores/friends-store.ts"
]
---

## Назначение
Экран `/app` показывает друзей пользователя, их онлайн-статус и новые заявки. Компоненты работают поверх Next.js app router и используют пакет `@video-chat/web-auth` для авторизации и socket.io для realtime.

## Точки входа
- `apps/web/app/app/page.tsx` — серверный роут, который проверяет сессию и монтирует клиентский `FriendsAppPage`.
- `apps/web/components/app/friends-app-page.tsx` — композиция стора, realtime-подписок и общего `AppShell`.
- Стор Zustand: `apps/web/stores/friends-store.ts`.

## Основные модули
- **AppShell** (`components/layout/app-shell.tsx`) — отвечает за layout с сайдбаром, профилем и кнопкой выхода.
- **FriendsSidebar** (`components/friends/friends-sidebar.tsx`) — поиск пользователей, список входящих/исходящих заявок, действия принятия/отклонения.
- **FriendsList** (`components/friends/friends-list.tsx`) — основной список друзей с фильтрами `все/онлайн/оффлайн` и состояниями загрузки.
- **PresenceDot/FriendListItem** — атомарные элементы отображения пользователя и статуса.

## Потоки данных и realtime
1. При маунте `FriendsAppPage` стор инициализируется текущим `username`, затем вызывает `FriendsApi.list()` для первичной гидратации.
2. `useFriendsRealtime` создаёт соединение `socket.io-client` с бэкендом (использует `accessToken` и `csrf` из `SessionProvider`).
3. Обработчики событий:
   - `presence:update` — обновляет `presenceByUserId` и перерисовывает список.
   - `friends:request`/`friends:accepted`/`friends:declined`/`friends:removed` — обновляют или удаляют записи в сторе и ставят уведомления.
4. Все события проходят через очередь `notifications`, которая отображается через `sonner` (`useFriendsToasts`).

## Авторизация и HTTP
- `useApiClient` строит `ApiClient` с базовым URL `env.client.apiBaseUrl`, cookie и `SessionProvider.refresh()`.
- `FriendsApi` (`packages/contracts/src/friends.ts`) инкапсулирует REST-вызовы `/friends/*`.
- `UsersApi.search` (`packages/contracts/src/users.ts`) обслуживает поиск по `/users/search`.

## Тестирование
- `vitest` конфигурирован в `apps/web/vitest.config.ts`.
- `apps/web/stores/friends-store.test.ts` проверяет определение направления заявок и обновление presence.
- Для ручной проверки использовать `pnpm --filter @video-chat/web dev` и убедиться, что socket.io события корректно обновляют UI.

## Дополнительные заметки
- `getInitialSession` теперь подтягивает access/refresh токены из cookie, поэтому socket.io получает авторизационную информацию даже после перезагрузки страницы.
- При появлении сервиса звонков actions `Позвонить` в `FriendListItem` нужно заменить на реальную навигацию/RTC-инвайт.
