#!/bin/bash
# Start Celery worker in the background (solo pool is the most memory-efficient for 512MB RAM)
celery -A app.core.celery_app worker --loglevel=info --queues=main-queue --pool=solo &

# Start FastAPI app
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
