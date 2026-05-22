from pydantic import BaseModel, Field


class LogEntryResponse(BaseModel):
    id: str
    tag: str
    message: str
    agent_id: str | None
    task_id: str | None
    payload: dict
    timestamp: str


class LogListResponse(BaseModel):
    execution_id: str
    total: int
    entries: list[LogEntryResponse]


class LogQueryParams(BaseModel):
    tag: str | None = None
    agent_id: str | None = None
    task_id: str | None = None
    search: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=500, ge=1, le=5000)
