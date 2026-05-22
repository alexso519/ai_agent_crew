from celery import Celery

from core.config import settings

celery_app = Celery("crewcc_api", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.task_routes = {"workflow.execute": {"queue": "workflow_queue"}}


def enqueue_workflow_execution(execution_id: str) -> str:
    result = celery_app.send_task(
        "workflow.execute",
        args=[execution_id],
        queue="workflow_queue",
    )
    return result.id
