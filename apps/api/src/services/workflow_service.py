from uuid import UUID

from sqlalchemy.orm import Session

from db.models.user import User
from db.models.workflow import Workflow
from schemas.workflow import GraphDefinitionPayload


class WorkflowService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, workflow_id: UUID) -> Workflow | None:
        return self.db.get(Workflow, workflow_id)

    def upsert_from_graph(
        self,
        owner: User,
        *,
        workflow_id: UUID | None,
        name: str,
        description: str,
        graph: GraphDefinitionPayload,
    ) -> Workflow:
        if workflow_id:
            workflow = self.get(workflow_id)
            if workflow is None:
                raise ValueError("Workflow not found")
            if workflow.owner_id != owner.id:
                raise PermissionError("Not workflow owner")
        else:
            workflow = Workflow(owner_id=owner.id, name=name, description=description)
            self.db.add(workflow)

        workflow.name = name
        workflow.description = description
        workflow.graph_definition = graph.model_dump()
        workflow.yaml_snapshot = graph.yaml
        self.db.commit()
        self.db.refresh(workflow)
        return workflow
