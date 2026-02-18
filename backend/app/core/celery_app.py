from celery import Celery
from app.core.config import settings

# Handle rediss:// SSL requirement for Upstash/Managed Redis
redis_url = settings.REDIS_URL
ssl_config = None
if redis_url.startswith("rediss://"):
    # If parameters aren't in the URL already, Celery requires explicit SSL options
    if "ssl_cert_reqs" not in redis_url:
        ssl_config = {"ssl_cert_reqs": "none"} # Upstash uses self-signed/public certs, 'none' is common for free tiers

celery_app = Celery(
    "worker",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.task_routes = {
    "app.tasks.*": "main-queue",
}

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    broker_use_ssl=ssl_config,
    redis_backend_use_ssl=ssl_config,
)
