# WEB CLIENT TODO — Next.js 15

## Страницы/роуты (app router)

- [x] `/auth/login`, `/auth/register`
- [ ] `/app` (главная после логина): список друзей, онлайн‑статус, поиск, «пригласить в звонок»
- [ ] `/call/[roomId]` — экран звонка (видео‑грид, mute/unmute, выбор устройств, чат)
- [ ] `/settings` — устройства/медиа, профиль

## Компоненты (shadcn)

- Navbar/Sidebar, FriendList, PresenceDot
- CallToolbar (mute/cam/screen/share/leave), DeviceSelector
- ChatPanel (виртуальный список, автоскролл)
- IncomingCallToast/Modal

## Сеть

- [x] REST-клиент по OpenAPI (генерация типов)
- [ ] socket.io‑client с auto‑reconnect и auth
- [ ] Получение ICE‑конфига перед стартом звонка, кэширование на 30–60 сек.

## WebRTC

- Управление `RTCPeerConnection` через абстракцию `usePeer`/`useRoom`
- Поддержка `getUserMedia`, `getDisplayMedia`
- Настройка кодеков: Opus + VP8/VP9/AV1 (по поддержке)
- Битрейт‑лимиты на слабых сетях; переключатель «только аудио»

## UX нюансы

- Pre-call device test (камера/микрофон)
- Хендлинг разрешений/ошибок
- Плавные переходы/анимации, горячие клавиши (m — mute, v — cam)
