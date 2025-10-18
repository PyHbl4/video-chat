# Self Prompt – 500 на `POST /rooms/{room_id}/join`

## Итоговая реализация
- В API-слое `videochat_api/api/endpoints/rooms.py` функция `_coerce_enum` преобразует строковые значения (`"active"`, `"guest"`) в Pydantic Enum перед сериализацией, поэтому `_model_to_schema` работает и с данными PostgreSQL, и с SQLite.
- `RoomService` дополнительно нормализует `room.status` и `participant.role` после загрузки из БД (`_normalize_room_enums`), чтобы бизнес-логика могла сравнивать Enum'ы.
- Тесты в `tests/test_rooms.py` проверяют сериализацию и возвращаемый статус без 500 ошибок.

## Что проверять при изменениях
- Если добавляются новые статусы комнат или роли участников, обновите Enum в моделях, схемах и `_coerce_enum`.
- При изменении структуры схемы не забудьте корректно сериализовать участников, иначе Socket.IO получит неожиданный payload.
- Следите, чтобы `RoomService.join_room` по-прежнему вызывал `_persist_cache` и `_reload`, иначе Redis и WebSocket могут расходиться с БД.
