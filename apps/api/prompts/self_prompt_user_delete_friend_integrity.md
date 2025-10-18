# Self Prompt – каскады дружбы при удалении пользователя

## Итоговая реализация
- `FriendRelationship` настроен с `passive_deletes=True` на обоих отношениях (`requester`, `addressee`) и обратных `backref`. Теперь SQLAlchemy не пытается обновлять `addressee_id=NULL`, а полагается на `ON DELETE CASCADE` базы данных.
- Тест `tests/test_users.py::test_delete_user_with_friendships` подтверждает, что удаление пользователя очищает связанные дружбы без `IntegrityError`.

## Регрессии
- Если изменяются связи дружбы или поведение каскадов, обновите тесты и убедитесь, что PostgreSQL по-прежнему удаляет записи автоматически.
- При добавлении soft-delete или архивирования дружбы придётся пересмотреть стратегию и, возможно, отказаться от `passive_deletes`.
