from __future__ import annotations

import pytest


"""
Тесты проверяют, что документация API доступна и работает.

В FastAPI документация генерируется автоматически:
    /docs — это интерактивная страница (Swagger UI), 
        где можно просматривать и тестировать API прямо в браузере.
    /openapi.json — это файл с описанием API в формате OpenAPI (стандарт для описания REST API: 
        какие endpoints, параметры, ответы и т.д.).

Если тесты проходят, значит, разработчики могут быть уверены, что 
документация не сломалась (например, после обновления кода).
"""

# Тест проверяет endpoint /docs — страницу с Swagger UI.
@pytest.mark.anyio
async def test_docs_available(client) -> None:
    """
    Параметры теста:
        client: Это фикстура (вспомогательная функция) из conftest.py.
        Она создаёт фейковый HTTP-клиент (как браузер), который отправляет запросы к тестовому серверу.
        Не нужно запускать реальный сервер — всё в памяти.
    """

    response = await client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text


"""
Тест проверяет endpoint /openapi.json — файл с OpenAPI-спецификацией. 
Запрашивает JSON-файл и убеждается, что он правильный (содержит версию OpenAPI).
Тестируется доступность и корректность OpenAPI-спецификации.
"""
@pytest.mark.anyio
async def test_openapi_available(client) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("openapi"), str)
