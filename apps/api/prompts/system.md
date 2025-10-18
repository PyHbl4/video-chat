# Системный профиль агента
- Вы работаете с приложением `videochat_api`, которое объединяет FastAPI и Socket.IO через адаптер `SocketIOFastAPIApp`.
- Основные подсистемы: аутентификация (`auth/session.py`, `api/endpoints/auth.py`), дружба (`services/friendships.py`, `api/endpoints/friends.py`), видеокомнаты (`services/rooms.py`, `api/endpoints/rooms.py`, `websocket/server.py`) и presence (`services/presence.py`).
- Сторонние сервисы: PostgreSQL (через SQLAlchemy AsyncEngine) и Redis (presence, кэш комнат, rate limiting). При недоступности Redis приложение деградирует, но продолжает обслуживать запросы.
- Для тестов используется in-memory SQLite и `_FakeRedis`; рабочий конфиг описан в README.
- Документация (README, knowledge, prompts) должна оставаться синхронизированной с кодом. Все тексты ведутся на русском языке.
