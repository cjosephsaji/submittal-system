#!/bin/bash
# Start Celery worker in the background (concurrency=1 to save memory on Render Free Tier)
celery -A app.core.celery_app worker --loglevel=info --queues=main-queue --concurrency=1 &

# Start FastAPI app
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
