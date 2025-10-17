# Комнаты видеозвонков

## Жизненный цикл комнаты
1. **Создание**. Пользователь-инициатор вызывает `POST /rooms` с `target_user_id`. `RoomService.create_room` проверяет дружбу, отсутствие активной комнаты у инициатора и формирует объект `Room` со статусом `waiting`. Одновременно через Socket.IO рассылается событие `room:invited` адресату. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L82-L118】【F:apps/api/videochat_api/services/rooms.py†L145-L191】
2. **Присоединение**. При первом успешном `POST /rooms/{room_id}/join` комната переходит в статус `active`, список участников пополняется, а событие `room:user_joined` отправляется в пространство `video-room:{id}` и индивидуальные комнаты пользователей. Повторный вызов идемпотентен — статус не меняется, `changed=False`. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L152-L198】【F:apps/api/videochat_api/services/rooms.py†L193-L218】
3. **Выход**. `POST /rooms/{room_id}/leave` помечает участника как покинувшего. Если в комнате никого не осталось, статус переключается на `closed`, а событие `room:user_left` рассылается слушателям. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L131-L198】
4. **Получение статуса**. `GET /rooms/{room_id}` возвращает актуальный снимок конкретной комнаты для участников, а `GET /rooms/me` выдаёт перечень всех комнат пользователя в статусах `waiting`, `active` и `ending`, включая приглашения, где он ещё не присоединился. Попытка доступа постороннего пользователя приведёт к `RoomForbiddenError`. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L130-L205】
5. **Админский список**. `GET /rooms` показывает активные и ожидающие комнаты, агрегируя данные из БД и Redis. Эндпоинт доступен только администраторам. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L59-L79】

## Ручная проверка функциональности
1. **Подготовка окружения**
   - Активируйте виртуальное окружение и установите зависимости `pip install -e .[dev]`.
   - Запустите сервис командой `uvicorn videochat_api.main:app --reload`.
   - Подготовьте отдельный Socket.IO-клиент (например, `python-socketio` или вкладка браузера) и подключите его к `/socket.io/?EIO=4&transport=websocket`.
2. **Создание аккаунтов и авторизация**
   - Через Swagger UI вызовите `POST /auth/register` для двух пользователей (A и B).
   - Вызовите `POST /auth/login` для каждого пользователя, сохраните полученные cookie и CSRF (`X-CSRF-Token`). Без передачи CSRF дальнейшие POST-запросы вернут 403. 【F:apps/api/videochat_api/api/endpoints/auth.py†L217-L259】
3. **Установление дружбы**
   - Пользователь A отправляет заявку (`POST /friends/request`). Проверьте в логах Socket.IO клиента событие `friend:request`.
   - Пользователь B принимает заявку (`POST /friends/accept`). После этого `FriendshipService.get_friend_user_ids` позволит RoomService создать комнату. 【F:apps/api/videochat_api/services/friendships.py†L1-L73】
4. **Создание комнаты**
   - Под пользователем A вызовите `POST /rooms` с `target_user_id = B`. Убедитесь, что ответ содержит `status=waiting`, а Socket.IO клиент пользователя B получил `room:invited` с нужным `room.id`.
   - Не меняя статус комнаты, авторизуйтесь под пользователем B и запросите `GET /rooms/me`. Ответ должен содержать комнату со статусом `waiting` и верным `roomId`, несмотря на отсутствие записи участника в БД.
   - Дополнительно запросите `GET /rooms/me`, чтобы убедиться, что инициатор видит созданную комнату в списке. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L92-L138】
5. **Присоединение и проверка идемпотентности**
   - Авторизуйтесь как пользователь B и вызовите `POST /rooms/{room_id}/join`. Проверьте, что REST-ответ содержит `status=active` и список участников из двух пользователей.
   - Socket.IO клиент должен зафиксировать `room:user_joined` в личной комнате пользователя A и в `video-room:{room_id}`.
   - Повторите `POST /rooms/{room_id}/join` — состояние не должно измениться, событие повторно не отсылается, что подтверждает идемпотентность.
6. **Просмотр статуса и защита**
   - Выполните `GET /rooms/{room_id}` под каждым участником и убедитесь, что `participants` отсортированы по времени присоединения.
   - Попробуйте вызвать `GET /rooms/{room_id}` от третьего аккаунта — должен вернуться `403 Forbidden`.
7. **Выход и закрытие**
   - Пользователь B вызывает `POST /rooms/{room_id}/leave`. Socket.IO получит `room:user_left`, а статус перейдёт в `ending` или `waiting` (если остался один участник).
   - Пользователь A вызывает `POST /rooms/{room_id}/leave`. После выхода последнего участника статус `closed`, событие рассылается, `GET /rooms/me` возвращает пустой список для обоих пользователей. 【F:apps/api/videochat_api/api/endpoints/rooms.py†L164-L196】【F:apps/api/videochat_api/services/rooms.py†L181-L248】
8. **Админский обзор**
   - Авторизуйтесь администратором, вызовите `GET /rooms` и убедитесь, что закрытая комната отсутствует в списке. Если до этого не завершали комнату, статус `waiting`/`active` будет отражён с актуальными участниками.

## Диагностика и тесты
- Юнит и интеграционные проверки сосредоточены в `tests/test_rooms.py`: покрывают создание, присоединение, идемпотентность `join`, выход и рассылку событий. Запускаются командой `pytest`. 【F:apps/api/tests/test_rooms.py†L1-L214】
- При отладке Redis можно временно отключить, чтобы проверить деградацию `RoomService`: состояния будут читаться напрямую из БД, но события Socket.IO продолжат отправляться. 【F:apps/api/videochat_api/services/rooms.py†L44-L107】
- В логах Socket.IO полезно включить debug (`python -m socketio.client --logger debug`), чтобы отслеживать доставку `room:`-событий при ручной проверке.
