from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.deps import OperatorUser
from db.models.agent import Agent
from db.session import get_db
from schemas.agent import AgentCreate, AgentResponse, AgentUpdate

router = APIRouter(prefix="/agents", tags=["agents"])


def _to_response(agent: Agent) -> AgentResponse:
    return AgentResponse(
        id=str(agent.id),
        name=agent.name,
        role=agent.role,
        goal=agent.goal,
        backstory=agent.backstory,
        llm_provider=agent.llm_provider,
        llm_model=agent.llm_model,
        workflow_id=str(agent.workflow_id) if agent.workflow_id else None,
    )


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    payload: AgentCreate,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> AgentResponse:
    agent = Agent(
        name=payload.name,
        role=payload.role,
        goal=payload.goal,
        backstory=payload.backstory,
        llm_provider=payload.llm_provider,
        llm_model=payload.llm_model,
        workflow_id=UUID(payload.workflow_id) if payload.workflow_id else None,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return _to_response(agent)


@router.get("", response_model=list[AgentResponse])
def list_agents(
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> list[AgentResponse]:
    agents = db.scalars(select(Agent).order_by(Agent.created_at.desc())).all()
    return [_to_response(a) for a in agents]


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: UUID,
    payload: AgentUpdate,
    _: OperatorUser,
    db: Session = Depends(get_db),
) -> AgentResponse:
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(agent, key, value)

    db.commit()
    db.refresh(agent)
    return _to_response(agent)
