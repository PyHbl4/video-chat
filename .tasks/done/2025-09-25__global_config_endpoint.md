---
title: "REST-ручка для глобального конфига"
status: done
assignee: "codex"
priority: medium
eta: null
tags: ["api", "matchmaking"]
links: ["../.ai_docs/apps/game-api/index.md"]
---

## Контекст

Команда клиенских приложений попросила добавить возможность получать глобальный конфиг арены через API. Конфиг уже формируется и используется матчмейкером (`MatchMaker.golbalConfig` подтягивается через `lookupKeyValue/lookupUrls`, ресурс `talent.global_config_json` хранится в resource-service). Требуется только чтение, без правок. Эндпоинт должен быть защищён авторизацией по той же схеме, что и остальные `/game-api/*` маршруты.

## Что сделать

- [x] Разобраться, где именно хранится глобальный конфиг и какой формат возвращается ресурс-сервисом (проверить `MatchMaker.updateGolbalConfig` и связанные helper'ы).
- [x] Определить URL и контракт новой ручки (например, `GET /game-api/config/global`), согласовать структуру ответа с клиентами.
- [x] Реализовать контроллер и маршрут в `apps/game-api` с проверкой авторизации/скоупов по текущим middleware.
- [x] Убедиться, что ручка возвращает актуальные данные и корректно обрабатывает ошибки (отсутствие ресурса, проблемы подключения).
- [x] Обновить документацию (`.ai_docs/apps/game-api/index.md` и при необходимости OpenAPI-док на `/game-api/doc`).

## Заметки

- Нужно уточнить, есть ли ожидания по кэшированию или версионированию ответа. При необходимости запросить у автора постановки.
  - ответ: пока нет, если появятся, мы это дополним
- При тестировании можно временно залить `talent.global_config_json` через resource-processing, либо использовать дефолты из кода.

## История выполнения

- 2025-09-25: Реализован эндпоинт `GET /game-api/config/global`, обновлена документация, задача готова к ревью.

## Тестирование

1. Локально собрали и запустили репозиторий (`npm install`, затем `npm run dev`), убедились, что `arena-game-api` и `resource-processing` подняты.
2. Авторизовались в Postman игровым Bearer-токеном, чтобы бэк принимал запросы к `/game-api/*`.
3. Через `POST http://localhost:10240/resources` загрузили дефолтный конфиг `talent.global_config_json`, передав тело с параметрами и блоком `value` (JSON глобального конфига). Первый запрос с `resourceValue` вернул ресурс без содержимого, поэтому повторили с корректным полем `value`.
4. Проверили, что ресурс доступен: `GET http://localhost:10240/resources?path=talent.global_config_json` вернул объект со `downloadUrl`.
5. Вызвали `GET http://localhost:10000/game-api/config/global` (через коллекцию Postman). Эндпоинт ответил `200 OK` и вернул актуальный конфиг:

```json
{
  "status": "Ok",
  "result": {
    "matchMaking": {
      "playerSelectionRange": 100,
      "rosterSelectionByValueRange": 100,
      "rosterSelectionByRatingRange": 100,
      "autoMatchRatingMultiplier": 1,
      "challengeMatchRatingMultiplier": 1,
      "defaultRating": 1000,
      "defaultReliability": 0.1,
      "reliabilityBump": 0.15,
      "minKfactor": 5,
      "maxKfactor": 80,
      "ratingRange": 200,
      "rosterChangeReliability": 0.1,
      "reliabilityDecayRate": 0.05,
      "unreliableRatingMultiplier": 1.5,
      "initialRatingWindowSize": 50,
      "ratingWindowSizeExpansionDelay": 5,
      "ratingWindowSizeExpansionRate": 10,
      "maxRatingWindowSize": 1000,
      "minRostersSelectionCount": 3,
      "minAutoRostersSelectionCount": 3,
      "updateGlobalConfigInterval": 10000,
      "manageMatchRequestsInterval": 1000,
      "fireGameLaunchCommandInterval": 3000,
      "matchRequestTtl": 1800000,
      "updateMatchStatusInterval": 600000,
      "updateRostersReliabilityInterval": 3600000,
      "deleteOldAuthIntentsInterval": 86400000
    },
    "gameServer": {
      "args": [],
      "execTimeLimit": 300000,
      "launchTimeout": 3000,
      "configFileName": "global-config.json",
      "executables": [
        "ArenaServer.x86_64"
      ],
      "binaryFileName": "ArenaServer.x86_64",
      "agentTasksLimit": 4
    },
    "logs": {
      "maxLogRecordsPerMatch": 300
    }
  }
}
```
