from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Self-Hosted Video Chat API"
    app_version: str = "0.0.1"
    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://video:video@localhost:5432/videochat"
    redis_url: str = "redis://localhost:6379/0"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
