import os

from celery import Celery

from config import settings

broker_url = os.getenv("CELERY_BROKER_URL", settings.redis_url)
result_backend = os.getenv("CELERY_RESULT_BACKEND", settings.redis_url)

celery_app = Celery(
    "crewcc_worker",
    broker=broker_url,
    backend=result_backend,
    include=["tasks"],
)

celery_app.conf.update(
    task_default_queue="workflow_queue",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
