import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload

from api.deps import OperatorUser
from db.models.execution import Execution
from db.session import get_db
from events.redis_bus import event_bus
from models.enums import ExecutionStatus
from schemas.metrics import (
    CreateSnapshotRequest,
    ExecutionMetricsResponse,
    SnapshotResponse,
    SnapshotRollbackResponse,
)
from schemas.observability import LogEntryResponse, LogListResponse
from schemas.workflow import (
    ExecutionStatusResponse,
    WorkflowControlRequest,
    WorkflowRunRequest,
    WorkflowRunResponse,
)
from crew_runtime.callbacks import ExecutionEvent
from services.celery_client import enqueue_workflow_execution
from services.execution_service import ExecutionService
from services.metrics_service import MetricsService
from services.snapshot_service import SnapshotService
from services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflow", tags=["workflow"])


def _execution_response(execution: Execution) -> ExecutionStatusResponse:
    ckpt = execution.checkpoint or {}
    return ExecutionStatusResponse(
        id=str(execution.id),
        workflow_id=str(execution.workflow_id),
        status=execution.status,
        error_message=execution.error_message,
        checkpoint=ckpt,
        celery_task_id=ckpt.get("celery_task_id"),
        started_at=execution.started_at.isoformat() if execution.started_at else None,
        finished_at=execution.finished_at.isoformat() if execution.finished_at else None,
    )


def _load_execution(db: Session, execution_id: UUID) -> Execution:
    execution = (
        db.query(Execution)
        .options(joinedload(Execution.workflow))
        .filter(Execution.id == execution_id)
        .first()
    )
    if execution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return execution


@router.post("/run", response_model=WorkflowRunResponse)
def run_workflow(
    payload: WorkflowRunRequest,
    user: OperatorUser,
    db: Session = Depends(get_db),
) -> WorkflowRunResponse:
    wf_service = WorkflowService(db)
    try:
        workflow = wf_service.upsert_from_graph(
            user,
            workflow_id=UUID(payload.workflow_id) if payload.workflow_id else None,
            name=payload.name,
            description=payload.description,
            graph=payload.graph_definition,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    exec_service = ExecutionService(db)
    checkpoint = {"inputs": payload.inputs, "graph_definition": payload.graph_definition.model_dump()}
    execution = exec_service.create_execution(workflow, checkpoint=checkpoint)

    celery_task_id = enqueue_workflow_execution(str(execution.id))
    exec_service.set_celery_task_id(execution, celery_task_id)

    exec_service.publish_and_persist(
        execution.id,
        ExecutionEvent(
            tag="Planning",
            message="Execution queued",
            execution_id=str(execution.id),
            payload={"celery_task_id": celery_task_id},
        ),
    )

    return WorkflowRunResponse(
        execution_id=str(execution.id),
        workflow_id=str(workflow.id),
        status=execution.status,
        celery_task_id=celery_task_id,
    )


@router.get("/status/{execution_id}", response_model=ExecutionStatusResponse)
def get_status(
    execution_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> ExecutionStatusResponse:
    execution = _load_execution(db, execution_id)
    return _execution_response(execution)


@router.post("/pause")
def pause_workflow(
    payload: WorkflowControlRequest,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> ExecutionStatusResponse:
    execution_id = UUID(payload.execution_id)
    execution = _load_execution(db, execution_id)
    if execution.status != ExecutionStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Can only pause running executions")

    event_bus.set_control(execution_id, "pause")
    exec_service = ExecutionService(db)
    execution = exec_service.update_status(execution, ExecutionStatus.SUSPENDED)
    return _execution_response(execution)


@router.post("/resume")
def resume_workflow(
    payload: WorkflowControlRequest,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> WorkflowRunResponse:
    execution_id = UUID(payload.execution_id)
    execution = _load_execution(db, execution_id)
    if execution.status not in (ExecutionStatus.SUSPENDED, ExecutionStatus.FAILED):
        raise HTTPException(
            status_code=400,
            detail="Can only resume suspended or failed executions",
        )

    event_bus.client.delete(event_bus.control_key(execution_id))
    exec_service = ExecutionService(db)
    execution = exec_service.update_status(execution, ExecutionStatus.PENDING)

    celery_task_id = enqueue_workflow_execution(str(execution.id))
    exec_service.set_celery_task_id(execution, celery_task_id)

    return WorkflowRunResponse(
        execution_id=str(execution.id),
        workflow_id=str(execution.workflow_id),
        status=execution.status,
        celery_task_id=celery_task_id,
    )


@router.post("/kill")
def kill_workflow(
    payload: WorkflowControlRequest,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> ExecutionStatusResponse:
    execution_id = UUID(payload.execution_id)
    execution = _load_execution(db, execution_id)

    event_bus.set_control(execution_id, "kill")
    ckpt = dict(execution.checkpoint or {})
    celery_task_id = ckpt.get("celery_task_id")
    if celery_task_id:
        from services.celery_client import celery_app

        celery_app.control.revoke(celery_task_id, terminate=True)

    exec_service = ExecutionService(db)
    execution = exec_service.update_status(
        execution,
        ExecutionStatus.FAILED,
        error_message="Killed by operator",
    )
    return _execution_response(execution)


@router.post("/replay/{execution_id}", response_model=WorkflowRunResponse)
def replay_workflow(
    execution_id: UUID,
    user: OperatorUser,
    db: Session = Depends(get_db),
    from_checkpoint: bool = True,
) -> WorkflowRunResponse:
    source = _load_execution(db, execution_id)
    workflow = source.workflow

    exec_service = ExecutionService(db)
    checkpoint = dict(source.checkpoint or {}) if from_checkpoint else {}
    checkpoint["replay_of"] = str(source.id)
    new_execution = exec_service.create_execution(
        workflow,
        checkpoint=checkpoint,
        replay_of=source.id,
    )

    celery_task_id = enqueue_workflow_execution(str(new_execution.id))
    exec_service.set_celery_task_id(new_execution, celery_task_id)

    return WorkflowRunResponse(
        execution_id=str(new_execution.id),
        workflow_id=str(workflow.id),
        status=new_execution.status,
        celery_task_id=celery_task_id,
    )


def _log_payload(entry) -> dict:
    payload = dict(entry.payload or {})
    task_id = payload.get("task_id")
    agent_ref = str(entry.agent_id) if entry.agent_id else payload.get("agent_id")
    return {
        "id": str(entry.id),
        "tag": entry.tag,
        "message": entry.message,
        "agent_id": agent_ref,
        "task_id": task_id,
        "payload": payload,
        "timestamp": entry.created_at.isoformat(),
        "token_count": payload.get("token_count"),
    }


async def _sse_generator(execution_id: UUID, db: Session):
    exec_service = ExecutionService(db)
    for entry in exec_service.list_logs(execution_id):
        yield f"data: {json.dumps(_log_payload(entry))}\n\n"

    pubsub = event_bus.pubsub(execution_id)
    heartbeat = 0
    try:
        while True:
            message = await asyncio.to_thread(pubsub.get_message, timeout=1.0)
            heartbeat += 1
            if heartbeat >= 15:
                heartbeat = 0
                yield f"data: {json.dumps({'tag': 'Planning', 'message': 'heartbeat', 'payload': {'type': 'heartbeat'}})}\n\n"
            if message is None:
                await asyncio.sleep(0.2)
                continue
            if message["type"] != "message":
                continue
            data = message["data"]
            if isinstance(data, bytes):
                data = data.decode()
            yield f"data: {data}\n\n"
    finally:
        pubsub.unsubscribe()


@router.get("/logs/{execution_id}", response_model=LogListResponse)
def list_execution_logs(
    execution_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
    tag: str | None = Query(default=None),
    agent_id: str | None = Query(default=None),
    task_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
) -> LogListResponse:
    _load_execution(db, execution_id)
    entries = ExecutionService(db).list_logs(
        execution_id,
        tag=tag,
        agent_id=agent_id,
        task_id=task_id,
        search=search,
        limit=limit,
    )
    return LogListResponse(
        execution_id=str(execution_id),
        total=len(entries),
        entries=[
            LogEntryResponse(
                id=str(e.id),
                tag=e.tag,
                message=e.message,
                agent_id=str(e.agent_id) if e.agent_id else (e.payload or {}).get("agent_id"),
                task_id=(e.payload or {}).get("task_id"),
                payload=e.payload or {},
                timestamp=e.created_at.isoformat(),
            )
            for e in entries
        ],
    )


@router.get("/logs/{execution_id}/export")
def export_execution_logs(
    execution_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
    tag: str | None = Query(default=None),
    agent_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> PlainTextResponse:
    _load_execution(db, execution_id)
    entries = ExecutionService(db).list_logs(
        execution_id,
        tag=tag,
        agent_id=agent_id,
        search=search,
        limit=5000,
    )
    lines = [
        f"[{e.created_at.isoformat()}] [{e.tag}] {e.message}"
        for e in entries
    ]
    body = "\n".join(lines) + ("\n" if lines else "")
    return PlainTextResponse(
        body,
        headers={
            "Content-Disposition": f'attachment; filename="execution-{execution_id}-logs.txt"',
        },
    )


@router.get("/metrics/{execution_id}", response_model=ExecutionMetricsResponse)
def get_execution_metrics(
    execution_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> ExecutionMetricsResponse:
    try:
        return MetricsService(db).get_execution_metrics(execution_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/retry/{execution_id}", response_model=WorkflowRunResponse)
def retry_execution(
    execution_id: UUID,
    user: OperatorUser,
    db: Session = Depends(get_db),
) -> WorkflowRunResponse:
    source = _load_execution(db, execution_id)
    if source.status not in (ExecutionStatus.FAILED, ExecutionStatus.SUSPENDED):
        raise HTTPException(
            status_code=400,
            detail="Retry only allowed for failed or suspended executions",
        )

    exec_service = ExecutionService(db)
    checkpoint = dict(source.checkpoint or {})
    checkpoint["retry_of"] = str(source.id)
    checkpoint.pop("error", None)

    execution = exec_service.create_execution(
        source.workflow,
        checkpoint=checkpoint,
        replay_of=source.id,
    )
    celery_task_id = enqueue_workflow_execution(str(execution.id))
    exec_service.set_celery_task_id(execution, celery_task_id)

    return WorkflowRunResponse(
        execution_id=str(execution.id),
        workflow_id=str(source.workflow_id),
        status=execution.status,
        celery_task_id=celery_task_id,
    )


@router.get("/snapshots/{execution_id}", response_model=list[SnapshotResponse])
def list_snapshots(
    execution_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> list[SnapshotResponse]:
    _load_execution(db, execution_id)
    snaps = SnapshotService(db).list_for_execution(execution_id)
    return [
        SnapshotResponse(
            id=str(s.id),
            execution_id=str(s.execution_id),
            label=s.label,
            created_at=s.created_at.isoformat(),
        )
        for s in snaps
    ]


@router.post("/snapshots/{execution_id}", response_model=SnapshotResponse)
def create_snapshot(
    execution_id: UUID,
    body: CreateSnapshotRequest,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> SnapshotResponse:
    _load_execution(db, execution_id)
    snap = SnapshotService(db).create(execution_id, body.label)
    return SnapshotResponse(
        id=str(snap.id),
        execution_id=str(snap.execution_id),
        label=snap.label,
        created_at=snap.created_at.isoformat(),
    )


@router.post("/snapshot/{snapshot_id}/rollback", response_model=SnapshotRollbackResponse)
def rollback_snapshot(
    snapshot_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> SnapshotRollbackResponse:
    try:
        execution = SnapshotService(db).rollback(snapshot_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return SnapshotRollbackResponse(
        execution_id=str(execution.id),
        snapshot_id=str(snapshot_id),
        status=execution.status.value,
        message="Checkpoint restored and execution re-queued",
    )


@router.get("/stream/{execution_id}")
async def stream_workflow(
    execution_id: UUID,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    _load_execution(db, execution_id)
    return StreamingResponse(
        _sse_generator(execution_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
