from __future__ import annotations
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url as redis_from_url

from videochat_api.api.routes import router as api_router
from videochat_api.asgi import create_socketio_fastapi_app
from videochat_api.config import settings
from videochat_api.db.session import get_engine
from videochat_api import models  # noqa: F401
from videochat_api.services import PresenceService
from videochat_api.websocket.server import bind_fastapi_app, sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = get_engine()
    redis = redis_from_url(settings.redis_url, decode_responses=True)
    app.state.redis = redis
    app.state.presence_service = PresenceService(redis)
    try:
        yield
    finally:
        await redis.aclose()
        await engine.dispose()


def create_fastapi_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3100",
            "http://127.0.0.1:3100",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    bind_fastapi_app(app)

    return app


fastapi_app = create_fastapi_app()

app = create_socketio_fastapi_app(fastapi_app, sio)


def main() -> None:
    """Run a development server when executed as a script."""
    import uvicorn

    uvicorn.run(
        "videochat_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        factory=False,
    )


if __name__ == "__main__":
    main()
