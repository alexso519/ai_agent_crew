from typing import Any

from pydantic import BaseModel, Field

from models.enums import ExecutionStatus


class GraphDefinitionPayload(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    yaml: dict[str, str] = Field(default_factory=dict)


class WorkflowRunRequest(BaseModel):
    workflow_id: str | None = None
    name: str = "Untitled Workflow"
    description: str = ""
    graph_definition: GraphDefinitionPayload
    inputs: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: ExecutionStatus
    celery_task_id: str | None = None


class WorkflowControlRequest(BaseModel):
    execution_id: str


class ExecutionStatusResponse(BaseModel):
    id: str
    workflow_id: str
    status: ExecutionStatus
    error_message: str | None
    checkpoint: dict[str, Any]
    celery_task_id: str | None = None
    started_at: str | None = None
    finished_at: str | None = None


class ReplayRequest(BaseModel):
    execution_id: str
    from_checkpoint: bool = True
