from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Callable


@dataclass
class ExecutionEvent:
    tag: str
    message: str
    execution_id: str
    agent_id: str | None = None
    task_id: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ObservabilityEmitter:
    """Publishes structured observability events (Planning, Thought, Action, etc.)."""

    VALID_TAGS = frozenset(
        {"Planning", "Thought", "Action", "Observation", "Tool", "Error"},
    )

    def __init__(
        self,
        execution_id: str,
        publish: Callable[[ExecutionEvent], None],
    ) -> None:
        self.execution_id = execution_id
        self._publish = publish

    def emit(
        self,
        tag: str,
        message: str,
        *,
        agent_id: str | None = None,
        task_id: str | None = None,
        **payload: Any,
    ) -> None:
        normalized_tag = tag if tag in self.VALID_TAGS else "Action"
        event = ExecutionEvent(
            tag=normalized_tag,
            message=message,
            execution_id=self.execution_id,
            agent_id=agent_id,
            task_id=task_id,
            payload=payload,
        )
        self._publish(event)

    def planning(self, message: str, **payload: Any) -> None:
        self.emit("Planning", message, **payload)

    def thought(self, message: str, *, agent_id: str | None = None, **payload: Any) -> None:
        self.emit("Thought", message, agent_id=agent_id, **payload)

    def action(self, message: str, *, agent_id: str | None = None, **payload: Any) -> None:
        self.emit("Action", message, agent_id=agent_id, **payload)

    def observation(
        self,
        message: str,
        *,
        agent_id: str | None = None,
        task_id: str | None = None,
        **payload: Any,
    ) -> None:
        self.emit("Observation", message, agent_id=agent_id, task_id=task_id, **payload)

    def tool(self, message: str, *, agent_id: str | None = None, **payload: Any) -> None:
        self.emit("Tool", message, agent_id=agent_id, **payload)

    def error(self, message: str, **payload: Any) -> None:
        self.emit("Error", message, **payload)
