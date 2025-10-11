from fastapi import APIRouter

from videochat_api.api.endpoints import auth as auth_endpoints
from videochat_api.api.endpoints import friends as friends_endpoints
from videochat_api.api.endpoints import system as system_endpoints
from videochat_api.api.endpoints import users as users_endpoints

router = APIRouter()

router.include_router(system_endpoints.router)
router.include_router(auth_endpoints.router)
router.include_router(users_endpoints.router)
router.include_router(friends_endpoints.router)
