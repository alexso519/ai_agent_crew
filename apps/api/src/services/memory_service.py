from uuid import UUID

from sqlalchemy.orm import Session

from db.models.memory import Memory
from models.enums import MemoryType


class MemoryService:
    """Memory subsystem — Redis short-term wiring in Phase 3."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def store_memory(
        self,
        *,
        memory_type: MemoryType,
        content: str | None = None,
        agent_id: UUID | None = None,
        workflow_id: UUID | None = None,
        entity_data: dict | None = None,
        embedding: list[float] | None = None,
    ) -> Memory:
        record = Memory(
            memory_type=memory_type,
            content=content,
            agent_id=agent_id,
            workflow_id=workflow_id,
            entity_data=entity_data or {},
            embedding=embedding,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def query_memory(
        self,
        *,
        agent_id: UUID | None = None,
        workflow_id: UUID | None = None,
        memory_type: MemoryType | None = None,
        limit: int = 50,
    ) -> list[Memory]:
        query = self.db.query(Memory)
        if agent_id is not None:
            query = query.filter(Memory.agent_id == agent_id)
        if workflow_id is not None:
            query = query.filter(Memory.workflow_id == workflow_id)
        if memory_type is not None:
            query = query.filter(Memory.memory_type == memory_type)
        return query.order_by(Memory.created_at.desc()).limit(limit).all()

    def clear_memory(
        self,
        *,
        agent_id: UUID | None = None,
        workflow_id: UUID | None = None,
    ) -> int:
        query = self.db.query(Memory)
        if agent_id is not None:
            query = query.filter(Memory.agent_id == agent_id)
        if workflow_id is not None:
            query = query.filter(Memory.workflow_id == workflow_id)
        count = query.delete()
        self.db.commit()
        return count
