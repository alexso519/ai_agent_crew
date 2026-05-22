from fastapi import APIRouter

from api.routes import agents, approvals, auth, health, workflow

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(agents.router)
api_router.include_router(workflow.router)
api_router.include_router(approvals.router)
