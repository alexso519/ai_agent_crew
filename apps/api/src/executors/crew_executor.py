"""Shared execution entrypoint for API replay and Celery worker."""

from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from core.config import settings
from crew_runtime.callbacks import ExecutionEvent
from crew_runtime.runner import CrewRunner
from db.models.execution import Execution
from models.enums import ExecutionStatus
from services.approval_service import ApprovalService
from services.execution_service import ExecutionService
from services.snapshot_service import SnapshotService


def _publish_factory(db: Session, execution_id: UUID):
    service = ExecutionService(db)

    def publish(event: ExecutionEvent) -> None:
        service.publish_and_persist(execution_id, event)

    return publish


def execute_crew_run(db: Session, execution_id: UUID) -> Execution:
    service = ExecutionService(db)
    execution = (
        db.query(Execution)
        .options(joinedload(Execution.workflow))
        .filter(Execution.id == execution_id)
        .first()
    )
    if execution is None:
        raise ValueError(f"Execution {execution_id} not found")

    workflow = execution.workflow
    checkpoint = dict(execution.checkpoint or {})
    graph = checkpoint.get("graph_definition") or workflow.graph_definition or {}
    service.update_status(execution, ExecutionStatus.RUNNING)
    service.publish_and_persist(
        execution_id,
        ExecutionEvent(
            tag="Planning",
            message="Worker picked up execution",
            execution_id=str(execution_id),
        ),
    )

    snapshot_service = SnapshotService(db)
    task_index = [0]

    def on_checkpoint(ckpt: dict) -> None:
        idx = task_index[0]
        snapshot_service.create(
            execution_id,
            label=f"task-checkpoint-{idx}",
            state={"checkpoint": ckpt, "status": ExecutionStatus.RUNNING.value},
        )
        task_index[0] += 1

    runner = CrewRunner(
        redis_url=settings.redis_url,
        ollama_base_url=settings.ollama_base_url,
    )
    result = runner.run(
        str(execution_id),
        graph,
        checkpoint,
        _publish_factory(db, execution_id),
        on_checkpoint=on_checkpoint,
    )

    status_map = {
        "success": ExecutionStatus.SUCCESS,
        "failed": ExecutionStatus.FAILED,
        "suspended": ExecutionStatus.SUSPENDED,
    }
    final_status = status_map.get(result.status, ExecutionStatus.FAILED)

    service.update_status(
        execution,
        final_status,
        error_message=result.error,
        checkpoint=result.checkpoint or checkpoint,
    )

    if final_status == ExecutionStatus.SUSPENDED and result.approval_context:
        ctx = result.approval_context
        ApprovalService(db).create_from_suspension(
            execution,
            task_node_id=str(ctx.get("task_node_id", "")),
            task_title=str(ctx.get("task_title", "Approval task")),
            agent_node_id=ctx.get("agent_node_id"),
            ai_draft=str(ctx.get("ai_draft", "")),
        )

    if result.output:
        service.save_snapshot(
            execution,
            label="final_output",
            state={"output": result.output},
        )

    service.publish_and_persist(
        execution_id,
        ExecutionEvent(
            tag="Planning",
            message=f"Execution finished: {final_status.value}",
            execution_id=str(execution_id),
            payload={"status": final_status.value},
        ),
    )

    db.refresh(execution)
    return execution
