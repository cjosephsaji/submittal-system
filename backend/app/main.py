import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Material Submittal System",
    description="Enterprise-grade Material Submittal & Compliance System",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

@app.middleware("http")
async def fix_redirect_location(request, call_next):
    response = await call_next(request)
    if "location" in response.headers:
        loc = response.headers["location"]
        # Aggressively remove any absolute local addresses from the redirect header.
        # This prevents the browser from trying to reach 127.0.0.1 directly.
        for prefix in [
            "http://127.0.0.1:8000", "https://127.0.0.1:8000",
            "http://localhost:8000", "https://localhost:8000",
            "http://0.0.0.0:8000", "https://0.0.0.0:8000"
        ]:
            if loc.startswith(prefix):
                response.headers["location"] = loc.replace(prefix, "")
                break
    return response

# CORS Configuration
# For production, we allow the main Vercel domain and any local development
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://submittal-system.vercel.app",
]

# Add any origins from environment variables
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([o.strip() for o in env_origins.split(",")])

# If we are in production/launch mode, we can allow all origins or be strict
# Setting allow_origins=["*"] is the most robust way to ensure a smooth launch
allow_all = os.getenv("CORS_ALLOW_ALL", "true").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Create uploads directory if not exists
os.makedirs("uploads", exist_ok=True)

app.mount("/static", StaticFiles(directory="uploads"), name="static")

from app.api.api import api_router

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "submittal-system-api"}

@app.get("/")
async def root():
    return {"message": "Welcome to the AI Material Submittal System API"}
