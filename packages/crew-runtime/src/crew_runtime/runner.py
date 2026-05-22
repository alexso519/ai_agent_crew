from dataclasses import dataclass
from typing import Any, Callable

from crew_runtime.builder import CrewBuilder
from crew_runtime.callbacks import ExecutionEvent, ObservabilityEmitter
from crew_runtime.control import ExecutionControl
from crew_runtime.graph import parse_graph_definition
from crew_runtime.tokens import estimate_tokens, merge_usage


@dataclass
class RunResult:
    status: str
    output: str | None = None
    error: str | None = None
    checkpoint: dict[str, Any] | None = None
    approval_context: dict[str, Any] | None = None


class CrewRunner:
    """
    Executes a workflow graph task-by-task with observability callbacks,
    checkpointing, and pause/kill support.
    """

    def __init__(
        self,
        *,
        redis_url: str,
        ollama_base_url: str | None = None,
    ) -> None:
        self._redis_url = redis_url
        self._builder = CrewBuilder(ollama_base_url=ollama_base_url)

    def run(
        self,
        execution_id: str,
        graph_definition: dict[str, Any],
        checkpoint: dict[str, Any] | None,
        publish: Callable[[ExecutionEvent], None],
        on_checkpoint: Callable[[dict[str, Any]], None] | None = None,
    ) -> RunResult:
        control = ExecutionControl(self._redis_url, execution_id)
        emitter = ObservabilityEmitter(execution_id, publish)

        parsed = parse_graph_definition(graph_definition)
        if not parsed.tasks:
            emitter.error("Workflow has no tasks to execute")
            return RunResult(status="failed", error="No tasks in workflow graph")

        emitter.planning(
            f"Building crew: {len(parsed.agents)} agents, {len(parsed.tasks)} tasks",
            agents=len(parsed.agents),
            tasks=len(parsed.tasks),
        )

        agents_by_id, built_tasks = self._builder.build_from_graph(parsed)
        start_index = int((checkpoint or {}).get("current_task_index", 0))
        outputs: list[str] = []
        ckpt: dict[str, Any] = dict(checkpoint or {})
        if "token_usage" not in ckpt:
            ckpt["token_usage"] = {"agents": {}, "tasks": {}, "workflow_total": 0}

        def record_tokens(text: str, agent_id: str | None, task_id: str | None) -> int:
            tokens = estimate_tokens(text)
            ckpt["token_usage"] = merge_usage(
                ckpt["token_usage"],
                agent_id=agent_id,
                task_id=task_id,
                tokens=tokens,
            )
            return tokens

        approved_outputs: dict[str, str] = dict((checkpoint or {}).get("approved_outputs") or {})

        for index, (spec, agent, crew_task) in enumerate(built_tasks):
            if index < start_index:
                continue

            if spec.id in approved_outputs:
                outputs.append(approved_outputs[spec.id])
                ckpt["current_task_index"] = index + 1
                emitter.observation(
                    f"Using approved output for {spec.title}",
                    agent_id=spec.agent_id,
                    task_id=spec.id,
                    phase="approved_skip",
                )
                continue

            if control.is_killed():
                emitter.error("Execution killed by operator")
                ckpt["current_task_index"] = index
                return RunResult(
                    status="failed",
                    error="Killed by operator",
                    checkpoint=ckpt,
                )

            if not control.wait_if_paused():
                emitter.error("Execution killed while paused")
                ckpt["current_task_index"] = index
                return RunResult(
                    status="failed",
                    error="Killed while paused",
                    checkpoint=ckpt,
                )

            agent_id = spec.agent_id

            if spec.requires_approval:
                if agent is None:
                    emitter.error(f"No agent assigned for approval task {spec.title}", task_id=spec.id)
                    ckpt["current_task_index"] = index
                    return RunResult(
                        status="failed",
                        error=f"No agent for task {spec.title}",
                        checkpoint=ckpt,
                    )
                try:
                    emitter.action(
                        f"Generating AI draft for approval: {spec.title}",
                        agent_id=agent_id,
                        task_id=spec.id,
                    )
                    if spec.tool_ids:
                        emitter.tool(
                            f"Tools available: {', '.join(spec.tool_ids)}",
                            agent_id=agent_id,
                            task_id=spec.id,
                        )
                    crew = self._builder.build_single_task_crew(agent, crew_task)
                    draft_result = crew.kickoff()
                    draft = str(
                        draft_result.raw if hasattr(draft_result, "raw") else draft_result
                    )
                    outputs.append(draft)
                    token_count = record_tokens(draft, agent_id, spec.id)
                    emitter.observation(
                        draft[:4000],
                        agent_id=agent_id,
                        task_id=spec.id,
                        phase="approval_draft",
                        token_count=token_count,
                    )
                except Exception as exc:
                    emitter.error(str(exc), task_id=spec.id, agent_id=agent_id)
                    ckpt["current_task_index"] = index
                    return RunResult(
                        status="failed",
                        error=str(exc),
                        checkpoint=ckpt,
                    )

                emitter.emit(
                    "Action",
                    f"Task '{spec.title}' awaiting human approval",
                    task_id=spec.id,
                    agent_id=agent_id,
                    requires_approval=True,
                )
                ckpt["current_task_index"] = index
                ckpt["awaiting_approval_task_id"] = spec.id
                ckpt["pending_ai_draft"] = draft
                return RunResult(
                    status="suspended",
                    output="\n".join(outputs),
                    checkpoint=ckpt,
                    approval_context={
                        "task_node_id": spec.id,
                        "task_title": spec.title,
                        "agent_node_id": agent_id,
                        "ai_draft": draft,
                    },
                )

            emitter.action(
                f"Starting task: {spec.title}",
                agent_id=agent_id,
                task_id=spec.id,
            )

            if agent is None:
                emitter.error(f"No agent assigned for task {spec.title}", task_id=spec.id)
                ckpt["current_task_index"] = index
                return RunResult(
                    status="failed",
                    error=f"No agent for task {spec.title}",
                    checkpoint=ckpt,
                )

            try:
                emitter.thought(
                    f"Agent {agent.role} executing: {spec.title}",
                    agent_id=agent_id,
                    task_id=spec.id,
                )
                if spec.tool_ids:
                    emitter.tool(
                        f"Tools available: {', '.join(spec.tool_ids)}",
                        agent_id=agent_id,
                        task_id=spec.id,
                    )
                crew = self._builder.build_single_task_crew(agent, crew_task)
                result = crew.kickoff()
                raw = str(result.raw if hasattr(result, "raw") else result)
                outputs.append(raw)
                token_count = record_tokens(raw, agent_id, spec.id)
                emitter.observation(
                    raw[:4000],
                    agent_id=agent_id,
                    task_id=spec.id,
                    token_count=token_count,
                )
                ckpt["current_task_index"] = index + 1
                ckpt.pop("awaiting_approval_task_id", None)
                if on_checkpoint:
                    on_checkpoint(ckpt.copy())
                emitter.action(
                    f"Completed task: {spec.title}",
                    agent_id=agent_id,
                    task_id=spec.id,
                    token_count=token_count,
                )
            except Exception as exc:
                emitter.error(str(exc), task_id=spec.id, agent_id=agent_id)
                ckpt["current_task_index"] = index
                return RunResult(
                    status="failed",
                    error=str(exc),
                    output="\n".join(outputs),
                    checkpoint=ckpt,
                )

        emitter.planning("Workflow execution finished successfully")
        return RunResult(
            status="success",
            output="\n\n".join(outputs),
            checkpoint=ckpt,
        )
