FastAPI-сервис, обеспечивающий бэкенд для платформы видеозвонков. Репозиторий организован как монорепо, а данная директория содержит исключительно код API, миграции и тесты.

## Стек
- **FastAPI** + **Uvicorn** — HTTP-приложение и сервер
- **SQLAlchemy** + **Alembic** — работа с PostgreSQL и миграции
- **Redis** — брокер для фоновых задач и хранения сессий
- **Pydantic** — валидация и сериализация
- **Pytest**, **mypy**, **ruff** — инструменты разработки

## Структура каталога
```
apps/api/
├── videochat_api/        # Исходный код приложения
│   ├── api/              # Роуты и зависимые схемы
│   ├── core/             # Конфигурация, utils, точки входа
│   ├── db/               # Сессии и декларативные модели
│   └── services/         # Доменные сценарии
├── alembic/              # Скрипты миграций базы данных
├── tests/                # Тесты Pytest
├── pyproject.toml        # Зависимости и конфигурация инструментов
├── alembic.ini           # Настройки Alembic
└── README.md             # Описания актуальной версии проекта
```

## Требования
- Python 3.11
- pip / virtualenv (или любая альтернатива: pyenv, poetry)
- PostgreSQL 15+ и Redis 6+ (локально либо в Docker)
- Docker Compose (по желанию, чтобы поднять инфраструктуру из корня монорепо)

## Быстрый старт
1. **Создайте и активируйте виртуальное окружение**
   ```bash
   cd apps/api
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   ```

2. **Установите зависимости** (основные + инструменты разработчика):
   ```bash
   pip install -e .[dev]
   ```

3. **Настройте переменные окружения**:
   ```bash
   cp ../../env/api.env.example .env
   # отредактируйте секреты, URL БД и Redis под своё окружение
   ```

4. **Поднимите инфраструктуру**. Проще всего использовать Docker Compose из корня репозитория:
   ```bash
   docker compose -f ../../infra/docker/docker-compose.dev.yml up -d db redis coturn
   ```
   Альтернативно запустите PostgreSQL и Redis локально и обновите `DATABASE_URL`, `REDIS_URL` в `.env`.


5. **Примените миграции**:
   ```bash
   alembic upgrade head
   ```

6. **Запустите API**:
   ```bash
   uvicorn videochat_api.main:app --reload --host 0.0.0.0 --port 8000
   ```
   После запуска документация будет доступна по адресу `http://localhost:8000/docs`.

## Тестирование и проверки качества
- Юнит и интеграционные тесты: `pytest`
- Статический анализ типов: `mypy videochat_api`
- Линтер/форматирование: `ruff check videochat_api tests`

## Полезные команды
- Создать новую миграцию: `alembic revision --autogenerate -m "short message"`
- Откатить миграции: `alembic downgrade -1`
- Экспорт зависимостей: `pip freeze > requirements.lock`

