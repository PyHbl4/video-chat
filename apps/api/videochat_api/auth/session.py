from __future__ import annotations

import secrets
from typing import Any

from itsdangerous import BadSignature, URLSafeTimedSerializer

from videochat_api.config import settings


class SessionManager:
    def __init__(self, secret_key: str, max_age_seconds: int) -> None:
        self.serializer = URLSafeTimedSerializer(secret_key=secret_key, salt="videochat-session")
        self.max_age = max_age_seconds

    def create(self, user_id: int) -> tuple[str, str]:
        csrf_token = secrets.token_urlsafe(32)
        payload = {"user_id": user_id, "csrf": csrf_token}
        value = self.serializer.dumps(payload)
        return value, csrf_token

    def load(self, value: str) -> dict[str, Any] | None:
        try:
            data = self.serializer.loads(value, max_age=self.max_age)
        except BadSignature:
            return None
        if not isinstance(data, dict) or "user_id" not in data or "csrf" not in data:
            return None
        return data

    def validate_csrf(self, value: str, csrf_token: str) -> bool:
        data = self.load(value)
        if not data:
            return False
        return secrets.compare_digest(str(data.get("csrf")), csrf_token)


session_manager = SessionManager(settings.session_secret, settings.session_max_age_seconds)
