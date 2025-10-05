from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import ASGIApp

from videochat_api.api.routes import router as api_router
from videochat_api.config import settings
from videochat_api.websocket.server import sio


def create_fastapi_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version)

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

    return app


fastapi_app = create_fastapi_app()

app = ASGIApp(sio, other_asgi_app=fastapi_app)


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
