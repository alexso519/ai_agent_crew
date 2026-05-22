from uuid import UUID

from celery_app import celery_app
from config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from executors.crew_executor import execute_crew_run


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@celery_app.task(name="workflow.execute", bind=True, max_retries=2)
def execute_workflow(self, execution_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        execution = execute_crew_run(db, UUID(execution_id))
        return {
            "execution_id": execution_id,
            "status": execution.status.value,
        }
    except Exception as exc:
        db.rollback()
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=5) from exc
        raise
    finally:
        db.close()
