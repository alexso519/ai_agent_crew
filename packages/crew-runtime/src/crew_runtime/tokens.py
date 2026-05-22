def estimate_tokens(text: str) -> int:
    """Heuristic token estimate (~4 chars per token) for cost dashboards."""
    if not text:
        return 0
    return max(1, len(text) // 4)


def merge_usage(
    usage: dict,
    *,
    agent_id: str | None,
    task_id: str | None,
    tokens: int,
) -> dict:
    agents = dict(usage.get("agents") or {})
    tasks = dict(usage.get("tasks") or {})
    if agent_id:
        agents[agent_id] = int(agents.get(agent_id, 0)) + tokens
    if task_id:
        tasks[task_id] = int(tasks.get(task_id, 0)) + tokens
    return {
        "agents": agents,
        "tasks": tasks,
        "workflow_total": int(usage.get("workflow_total") or 0) + tokens,
    }
