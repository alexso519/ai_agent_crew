from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from db.models.execution import Execution
from db.models.snapshot import Snapshot
from models.enums import ExecutionStatus
from services.celery_client import enqueue_workflow_execution
from services.execution_service import ExecutionService


class SnapshotService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._executions = ExecutionService(db)

    def list_for_execution(self, execution_id: UUID) -> list[Snapshot]:
        return list(
            self.db.scalars(
                select(Snapshot)
                .where(Snapshot.execution_id == execution_id)
                .order_by(Snapshot.created_at.desc()),
            ).all(),
        )

    def create(
        self,
        execution_id: UUID,
        label: str,
        *,
        state: dict | None = None,
    ) -> Snapshot:
        execution = self.db.get(Execution, execution_id)
        if execution is None:
            raise ValueError("Execution not found")
        snap_state = state or {
            "checkpoint": dict(execution.checkpoint or {}),
            "status": execution.status.value,
        }
        snap = Snapshot(
            execution_id=execution_id,
            label=label,
            state=snap_state,
        )
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        return snap

    def get(self, snapshot_id: UUID) -> Snapshot | None:
        return self.db.scalar(
            select(Snapshot)
            .options(joinedload(Snapshot.execution))
            .where(Snapshot.id == snapshot_id),
        )

    def rollback(self, snapshot_id: UUID) -> Execution:
        snap = self.get(snapshot_id)
        if snap is None:
            raise ValueError("Snapshot not found")

        execution = (
            self.db.query(Execution)
            .options(joinedload(Execution.workflow))
            .filter(Execution.id == snap.execution_id)
            .first()
        )
        if execution is None:
            raise ValueError("Execution not found")

        restored = dict(snap.state.get("checkpoint") or snap.state)
        execution.checkpoint = restored
        execution.error_message = None
        self._executions.update_status(execution, ExecutionStatus.PENDING, checkpoint=restored)

        celery_id = enqueue_workflow_execution(str(execution.id))
        self._executions.set_celery_task_id(execution, celery_id)
        self.db.commit()
        self.db.refresh(execution)
        return execution
