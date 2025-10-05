from fastapi import APIRouter

from videochat_api.config import settings

router = APIRouter()


@router.get("/health", tags=["system"])
async def read_health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/version", tags=["system"])
async def read_version() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
    }
