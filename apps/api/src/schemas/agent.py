from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    goal: str | None = None
    backstory: str | None = None
    llm_provider: str = "ollama"
    llm_model: str = "llama3"
    workflow_id: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    role: str | None = Field(default=None, min_length=1, max_length=255)
    goal: str | None = None
    backstory: str | None = None
    llm_provider: str | None = None
    llm_model: str | None = None


class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    goal: str | None
    backstory: str | None
    llm_provider: str
    llm_model: str
    workflow_id: str | None

    model_config = {"from_attributes": True}
