from pydantic import BaseModel, Field


class TokenSeriesItem(BaseModel):
    id: str
    label: str
    tokens: int
    estimated_cost_usd: float = 0.0


class TimelineItem(BaseModel):
    task_id: str
    task_label: str
    agent_id: str | None
    start: str
    end: str
    status: str
    duration_ms: int


class HeatmapCell(BaseModel):
    hour: str
    failures: int
    executions: int


class ExecutionMetricsResponse(BaseModel):
    execution_id: str
    workflow_id: str
    workflow_name: str
    status: str
    token_usage: dict
    tokens_by_agent: list[TokenSeriesItem]
    tokens_by_task: list[TokenSeriesItem]
    workflow_total_tokens: int
    workflow_estimated_cost_usd: float
    timeline: list[TimelineItem]
    failure_heatmap: list[HeatmapCell]
    error_count: int
    snapshot_count: int


class SnapshotResponse(BaseModel):
    id: str
    execution_id: str
    label: str
    created_at: str


class SnapshotRollbackResponse(BaseModel):
    execution_id: str
    snapshot_id: str
    status: str
    message: str


class CreateSnapshotRequest(BaseModel):
    label: str = Field(min_length=1, max_length=255)
