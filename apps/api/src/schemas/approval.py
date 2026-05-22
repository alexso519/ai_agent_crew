from pydantic import BaseModel, Field

from models.enums import ApprovalStatus


class ApprovalSummary(BaseModel):
    id: str
    execution_id: str
    status: ApprovalStatus
    task_title: str
    agent_label: str
    draft_preview: str
    created_at: str


class ApprovalDetail(BaseModel):
    id: str
    execution_id: str
    workflow_id: str
    workflow_name: str
    status: ApprovalStatus
    task_node_id: str
    task_title: str
    agent_node_id: str | None
    agent_label: str
    ai_draft: str | None
    human_edit: str | None
    instructions: str | None
    metadata: dict
    created_at: str
    resolved_at: str | None


class ApprovalDecisionRequest(BaseModel):
    human_edit: str | None = None
    instructions: str | None = Field(default=None, max_length=4000)


class ApprovalRejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)


class ApprovalCountResponse(BaseModel):
    pending: int
