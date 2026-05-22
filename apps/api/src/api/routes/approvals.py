from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api.deps import OperatorUser, require_role  # noqa: F401 — OperatorUser used in resume
from db.models.approval import Approval
from db.models.execution import Execution
from db.models.user import User
from db.session import get_db
from models.enums import UserRole
from schemas.approval import (
    ApprovalCountResponse,
    ApprovalDecisionRequest,
    ApprovalDetail,
    ApprovalRejectRequest,
    ApprovalSummary,
)
from schemas.workflow import WorkflowRunResponse
from services.approval_service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["approvals"])

ReviewerUser = User  # type alias for clarity; enforced via require_role


def _summary(approval: Approval) -> ApprovalSummary:
    meta = approval.metadata_ or {}
    draft = (approval.ai_draft or "")[:240]
    return ApprovalSummary(
        id=str(approval.id),
        execution_id=str(approval.execution_id),
        status=approval.status,
        task_title=str(meta.get("task_title", "Task")),
        agent_label=str(meta.get("agent_node_id", "agent"))[:32],
        draft_preview=draft,
        created_at=approval.created_at.isoformat(),
    )


def _detail(approval: Approval) -> ApprovalDetail:
    meta = approval.metadata_ or {}
    execution = approval.execution
    workflow = execution.workflow if execution else None
    return ApprovalDetail(
        id=str(approval.id),
        execution_id=str(approval.execution_id),
        workflow_id=str(execution.workflow_id) if execution else "",
        workflow_name=workflow.name if workflow else "Workflow",
        status=approval.status,
        task_node_id=str(meta.get("task_node_id", "")),
        task_title=str(meta.get("task_title", "Task")),
        agent_node_id=meta.get("agent_node_id"),
        agent_label=str(meta.get("agent_node_id", "agent")),
        ai_draft=approval.ai_draft,
        human_edit=approval.human_edit,
        instructions=meta.get("instructions"),
        metadata=meta,
        created_at=approval.created_at.isoformat(),
        resolved_at=approval.resolved_at.isoformat() if approval.resolved_at else None,
    )


@router.get("/count", response_model=ApprovalCountResponse)
def pending_count(
    _: User = Depends(require_role(UserRole.REVIEWER)),
    db: Session = Depends(get_db),
) -> ApprovalCountResponse:
    return ApprovalCountResponse(pending=ApprovalService(db).pending_count())


@router.get("", response_model=list[ApprovalSummary])
def list_approvals(
    _: User = Depends(require_role(UserRole.REVIEWER)),
    db: Session = Depends(get_db),
) -> list[ApprovalSummary]:
    approvals = ApprovalService(db).list_pending()
    return [_summary(a) for a in approvals]


@router.get("/{approval_id}", response_model=ApprovalDetail)
def get_approval(
    approval_id: UUID,
    _: User = Depends(require_role(UserRole.REVIEWER)),
    db: Session = Depends(get_db),
) -> ApprovalDetail:
    approval = db.scalar(
        select(Approval)
        .options(
            joinedload(Approval.execution).joinedload(Execution.workflow),
        )
        .where(Approval.id == approval_id),
    )
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    return _detail(approval)


@router.post("/{approval_id}/approve")
def approve(
    approval_id: UUID,
    body: ApprovalDecisionRequest,
    _: User = Depends(require_role(UserRole.REVIEWER)),
    db: Session = Depends(get_db),
) -> ApprovalDetail:
    service = ApprovalService(db)
    approval = service.get(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    try:
        service.approve(approval, human_edit=body.human_edit, instructions=body.instructions)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(approval)
    approval = db.scalar(
        select(Approval)
        .options(joinedload(Approval.execution).joinedload(Execution.workflow))
        .where(Approval.id == approval_id),
    )
    return _detail(approval)  # type: ignore[arg-type]


@router.post("/{approval_id}/reject")
def reject(
    approval_id: UUID,
    body: ApprovalRejectRequest,
    _: User = Depends(require_role(UserRole.REVIEWER)),
    db: Session = Depends(get_db),
) -> ApprovalDetail:
    service = ApprovalService(db)
    approval = service.get(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    try:
        service.reject(approval, body.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(approval)
    approval = db.scalar(
        select(Approval)
        .options(joinedload(Approval.execution).joinedload(Execution.workflow))
        .where(Approval.id == approval_id),
    )
    return _detail(approval)  # type: ignore[arg-type]


@router.post("/{approval_id}/regenerate", response_model=ApprovalDetail)
def regenerate(
    approval_id: UUID,
    _: User = Depends(require_role(UserRole.REVIEWER)),
    db: Session = Depends(get_db),
) -> ApprovalDetail:
    service = ApprovalService(db)
    approval = service.get(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    try:
        approval = service.regenerate_draft(approval)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    approval = db.scalar(
        select(Approval)
        .options(joinedload(Approval.execution).joinedload(Execution.workflow))
        .where(Approval.id == approval_id),
    )
    return _detail(approval)  # type: ignore[arg-type]


@router.post("/{approval_id}/resume")
def resume_workflow(
    approval_id: UUID,
    body: ApprovalDecisionRequest,
    _user: OperatorUser,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    service = ApprovalService(db)
    approval = service.get(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    try:
        if body.human_edit:
            approval.human_edit = body.human_edit
        execution = service.approve(
            approval,
            human_edit=body.human_edit or approval.ai_draft,
            instructions=body.instructions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    ckpt = execution.checkpoint or {}
    return {
        "execution_id": str(execution.id),
        "status": execution.status.value,
        "celery_task_id": str(ckpt.get("celery_task_id", "")),
        "message": "Workflow resumed",
    }
