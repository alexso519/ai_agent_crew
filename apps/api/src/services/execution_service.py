from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models.execution import Execution
from db.models.log import LogEntry
from db.models.snapshot import Snapshot
from db.models.workflow import Workflow
from events.redis_bus import event_bus
from models.enums import ExecutionStatus
from crew_runtime.callbacks import ExecutionEvent


class ExecutionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, execution_id: UUID) -> Execution | None:
        return self.db.get(Execution, execution_id)

    def create_execution(
        self,
        workflow: Workflow,
        *,
        checkpoint: dict | None = None,
        replay_of: UUID | None = None,
    ) -> Execution:
        ckpt = dict(checkpoint or {})
        if replay_of:
            ckpt["replay_of"] = str(replay_of)
        execution = Execution(
            workflow_id=workflow.id,
            status=ExecutionStatus.PENDING,
            checkpoint=ckpt,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def set_celery_task_id(self, execution: Execution, task_id: str) -> Execution:
        ckpt = dict(execution.checkpoint or {})
        ckpt["celery_task_id"] = task_id
        execution.checkpoint = ckpt
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def update_status(
        self,
        execution: Execution,
        status: ExecutionStatus,
        *,
        error_message: str | None = None,
        checkpoint: dict | None = None,
    ) -> Execution:
        execution.status = status
        if error_message is not None:
            execution.error_message = error_message
        if checkpoint is not None:
            execution.checkpoint = checkpoint
        now = datetime.now(UTC)
        if status == ExecutionStatus.RUNNING and execution.started_at is None:
            execution.started_at = now
        if status in (ExecutionStatus.SUCCESS, ExecutionStatus.FAILED):
            execution.finished_at = now
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def persist_event(self, execution_id: UUID, event: ExecutionEvent) -> None:
        agent_uuid = None
        if event.agent_id:
            try:
                agent_uuid = UUID(event.agent_id)
            except ValueError:
                agent_uuid = None

        entry = LogEntry(
            execution_id=execution_id,
            agent_id=agent_uuid,
            tag=event.tag,
            message=event.message,
            payload={
                **event.payload,
                "task_id": event.task_id,
                "agent_id": event.agent_id,
                "timestamp": event.timestamp,
            },
        )
        self.db.add(entry)
        self.db.commit()
        event_bus.publish_event(event)

    def publish_and_persist(self, execution_id: UUID, event: ExecutionEvent) -> None:
        self.persist_event(execution_id, event)

    def save_snapshot(
        self,
        execution: Execution,
        label: str,
        state: dict,
    ) -> Snapshot:
        snap = Snapshot(
            execution_id=execution.id,
            label=label,
            state=state,
        )
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        return snap

    def list_logs(
        self,
        execution_id: UUID,
        *,
        limit: int = 500,
        tag: str | None = None,
        agent_id: str | None = None,
        task_id: str | None = None,
        search: str | None = None,
    ) -> list[LogEntry]:
        query = (
            select(LogEntry)
            .where(LogEntry.execution_id == execution_id)
            .order_by(LogEntry.created_at.asc())
        )
        if tag:
            query = query.where(LogEntry.tag == tag)
        if search:
            query = query.where(LogEntry.message.ilike(f"%{search}%"))
        entries = list(self.db.scalars(query.limit(limit)).all())
        if agent_id:
            entries = [
                e
                for e in entries
                if (e.payload or {}).get("task_id") == agent_id
                or str(e.agent_id) == agent_id
                or (e.payload or {}).get("agent_id") == agent_id
            ]
        if task_id:
            entries = [e for e in entries if (e.payload or {}).get("task_id") == task_id]
        return entries[:limit]
