from __future__ import annotations

from passlib.context import CryptContext

_password_context = CryptContext(schemes=["argon2"], deprecated="auto")


# Функция для хэширования пароля.
def hash_password(password: str) -> str:
    return _password_context.hash(password)


# Проверка пароля.
def verify_password(password: str, password_hash: str) -> bool:
    return _password_context.verify(password, password_hash)
