from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Self-Hosted Video Chat API"
    app_version: str = "0.0.1"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://video:video@localhost:5432/videochat"
    redis_url: str = "redis://localhost:6379/0"

    session_secret: str = "dev-secret"
    session_cookie_name: str = "session"
    session_cookie_samesite: str = "lax"
    session_cookie_secure: bool = False
    session_max_age_seconds: int = 60 * 60 * 24 * 7

    csrf_header_name: str = "x-csrf-token"
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 60

    jwt_secret: str = "dev-jwt-secret"
    jwt_algorithm: str = "HS256"
    jwt_clock_skew_seconds: int = 30
    access_token_ttl_seconds: int = 60 * 15
    refresh_token_ttl_seconds: int = 60 * 60 * 24 * 30

    @property
    def database_url_async(self) -> str:
        url = self.database_url
        if "+psycopg" in url:
            return url.replace("+psycopg", "+asyncpg")
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def csrf_header(self) -> str:
        return self.csrf_header_name.lower()

    @property
    def session_samesite(self) -> str:
        value = self.session_cookie_samesite.lower()
        if value not in {"lax", "strict", "none"}:
            return "lax"
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
