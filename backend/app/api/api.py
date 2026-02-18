from fastapi import APIRouter
from app.api.v1.endpoints import auth, submittals, users, requirements, projects, admin, categories, tenants

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(requirements.router, prefix="/requirements", tags=["requirements"])
api_router.include_router(submittals.router, prefix="/submittals", tags=["submittals"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
