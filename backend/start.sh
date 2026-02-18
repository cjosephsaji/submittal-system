#!/bin/bash
# Start Celery worker in the background
celery -A app.core.celery_app worker --loglevel=info --queues=main-queue &

# Start FastAPI app
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
