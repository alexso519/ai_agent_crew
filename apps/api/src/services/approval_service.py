from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from crew_runtime.builder import CrewBuilder
from crew_runtime.graph import parse_graph_definition
from db.models.approval import Approval
from db.models.execution import Execution
from events.redis_bus import event_bus
from models.enums import ApprovalStatus, ExecutionStatus
from services.celery_client import enqueue_workflow_execution
from services.execution_service import ExecutionService
from core.config import settings
from crew_runtime.callbacks import ExecutionEvent


class ApprovalService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._executions = ExecutionService(db)

    def create_from_suspension(
        self,
        execution: Execution,
        *,
        task_node_id: str,
        task_title: str,
        agent_node_id: str | None,
        ai_draft: str,
    ) -> Approval:
        existing = self.db.scalar(
            select(Approval).where(
                Approval.execution_id == execution.id,
                Approval.status == ApprovalStatus.PENDING,
            ),
        )
        if existing is not None:
            existing.ai_draft = ai_draft
            existing.metadata_ = {
                **(existing.metadata_ or {}),
                "task_node_id": task_node_id,
                "task_title": task_title,
                "agent_node_id": agent_node_id,
            }
            self.db.commit()
            self.db.refresh(existing)
            return existing

        approval = Approval(
            execution_id=execution.id,
            status=ApprovalStatus.PENDING,
            ai_draft=ai_draft,
            metadata_={
                "task_node_id": task_node_id,
                "task_title": task_title,
                "agent_node_id": agent_node_id,
            },
        )
        self.db.add(approval)
        self.db.commit()
        self.db.refresh(approval)

        self._executions.publish_and_persist(
            execution.id,
            ExecutionEvent(
                tag="Action",
                message=f"Approval required: {task_title}",
                execution_id=str(execution.id),
                task_id=task_node_id,
                agent_id=agent_node_id,
                payload={
                    "approval_id": str(approval.id),
                    "requires_approval": True,
                },
            ),
        )
        return approval

    def list_pending(self, *, limit: int = 50) -> list[Approval]:
        return list(
            self.db.scalars(
                select(Approval)
                .where(Approval.status == ApprovalStatus.PENDING)
                .order_by(Approval.created_at.desc())
                .limit(limit),
            ).all(),
        )

    def pending_count(self) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(Approval)
                .where(Approval.status == ApprovalStatus.PENDING),
            )
            or 0,
        )

    def get(self, approval_id: UUID) -> Approval | None:
        return self.db.get(Approval, approval_id)

    def approve(
        self,
        approval: Approval,
        *,
        human_edit: str | None,
        instructions: str | None,
    ) -> Execution:
        if approval.status != ApprovalStatus.PENDING:
            raise ValueError("Approval is not pending")

        execution = self._load_execution(approval.execution_id)
        meta = approval.metadata_ or {}
        task_node_id = str(meta.get("task_node_id", ""))

        ckpt = dict(execution.checkpoint or {})
        approved_outputs = dict(ckpt.get("approved_outputs") or {})
        final_text = (human_edit or approval.ai_draft or "").strip()
        approved_outputs[task_node_id] = final_text
        ckpt["approved_outputs"] = approved_outputs
        ckpt["current_task_index"] = int(ckpt.get("current_task_index", 0)) + 1
        ckpt.pop("awaiting_approval_task_id", None)
        ckpt.pop("pending_ai_draft", None)
        if instructions:
            ckpt["last_approval_instructions"] = instructions

        approval.status = ApprovalStatus.APPROVED
        approval.human_edit = human_edit
        approval.metadata_ = {**meta, "instructions": instructions}
        approval.resolved_at = datetime.now(UTC)

        execution.checkpoint = ckpt
        execution.error_message = None
        self._executions.update_status(execution, ExecutionStatus.PENDING, checkpoint=ckpt)

        event_bus.client.delete(event_bus.control_key(execution.id))
        celery_id = enqueue_workflow_execution(str(execution.id))
        self._executions.set_celery_task_id(execution, celery_id)

        self.db.commit()
        self.db.refresh(execution)
        return execution

    def reject(self, approval: Approval, reason: str) -> Execution:
        if approval.status != ApprovalStatus.PENDING:
            raise ValueError("Approval is not pending")

        execution = self._load_execution(approval.execution_id)
        approval.status = ApprovalStatus.REJECTED
        approval.human_edit = reason
        approval.resolved_at = datetime.now(UTC)

        self._executions.update_status(
            execution,
            ExecutionStatus.FAILED,
            error_message=f"Rejected by reviewer: {reason}",
        )
        event_bus.set_control(execution.id, "kill")
        self.db.commit()
        return execution

    def regenerate_draft(self, approval: Approval) -> Approval:
        if approval.status != ApprovalStatus.PENDING:
            raise ValueError("Approval is not pending")

        execution = self._load_execution(approval.execution_id)
        meta = approval.metadata_ or {}
        task_node_id = str(meta.get("task_node_id", ""))
        graph = dict(execution.checkpoint or {}).get("graph_definition") or (
            execution.workflow.graph_definition or {}
        )
        parsed = parse_graph_definition(graph)
        task_spec = next((t for t in parsed.tasks if t.id == task_node_id), None)
        if task_spec is None:
            raise ValueError("Task not found in workflow graph")

        builder = CrewBuilder(ollama_base_url=settings.ollama_base_url)
        agents_by_id, built = builder.build_from_graph(parsed)
        match = next((item for item in built if item[0].id == task_node_id), None)
        if match is None:
            raise ValueError("Unable to rebuild task for regeneration")

        _spec, agent, crew_task = match
        if agent is None:
            raise ValueError("No agent bound to task")

        crew = builder.build_single_task_crew(agent, crew_task)
        result = crew.kickoff()
        draft = str(result.raw if hasattr(result, "raw") else result)

        approval.ai_draft = draft
        ckpt = dict(execution.checkpoint or {})
        ckpt["pending_ai_draft"] = draft
        execution.checkpoint = ckpt
        self.db.commit()
        self.db.refresh(approval)
        return approval

    def resume_after_review(self, approval: Approval) -> Execution:
        """Alias for approve using existing human_edit if set."""
        return self.approve(
            approval,
            human_edit=approval.human_edit,
            instructions=(approval.metadata_ or {}).get("instructions"),
        )

    def _load_execution(self, execution_id: UUID) -> Execution:
        execution = (
            self.db.query(Execution)
            .options(joinedload(Execution.workflow))
            .filter(Execution.id == execution_id)
            .first()
        )
        if execution is None:
            raise ValueError("Execution not found")
        return execution
