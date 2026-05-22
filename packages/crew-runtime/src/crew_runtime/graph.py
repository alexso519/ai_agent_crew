from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GraphAgent:
    id: str
    name: str
    role: str
    goal: str
    backstory: str
    llm_provider: str
    llm_model: str
    temperature: float
    max_tokens: int
    iterations: int
    rpm_limit: int
    memory: dict[str, bool]
    tool_ids: list[str] = field(default_factory=list)


@dataclass
class GraphTask:
    id: str
    title: str
    description: str
    expected_output: str
    agent_id: str | None
    requires_approval: bool
    order: int = 0


@dataclass
class GraphTool:
    id: str
    name: str
    tool_name: str
    permissions: list[str]


@dataclass
class ParsedWorkflowGraph:
    agents: list[GraphAgent]
    tasks: list[GraphTask]
    tools: list[GraphTool]
    edges: list[dict[str, str]]


def _node_data(node: dict[str, Any]) -> dict[str, Any]:
    return node.get("data") or {}


def _node_type(node: dict[str, Any]) -> str:
    data = _node_data(node)
    return str(data.get("nodeType") or node.get("type") or "")


def parse_graph_definition(graph: dict[str, Any]) -> ParsedWorkflowGraph:
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []

    agents: list[GraphAgent] = []
    tasks: list[GraphTask] = []
    tools: list[GraphTool] = []

    tool_nodes_by_id: dict[str, GraphTool] = {}
    agent_ids: set[str] = set()

    for node in nodes:
        node_id = str(node.get("id", ""))
        data = _node_data(node)
        ntype = _node_type(node)

        if ntype == "agent":
            agent_ids.add(node_id)
            memory = {
                "short_term": bool(data.get("memoryShortTerm")),
                "long_term": bool(data.get("memoryLongTerm")),
                "entity": bool(data.get("memoryEntity")),
            }
            agents.append(
                GraphAgent(
                    id=node_id,
                    name=str(data.get("label") or node_id),
                    role=str(data.get("role") or "Agent"),
                    goal=str(data.get("goal") or ""),
                    backstory=str(data.get("backstory") or ""),
                    llm_provider=str(data.get("llmProvider") or "ollama"),
                    llm_model=str(data.get("llmModel") or "llama3"),
                    temperature=float(data.get("temperature") or 0.7),
                    max_tokens=int(data.get("maxTokens") or 4096),
                    iterations=int(data.get("iterations") or 10),
                    rpm_limit=int(data.get("rpmLimit") or 60),
                    memory=memory,
                ),
            )
        elif ntype == "task":
            tasks.append(
                GraphTask(
                    id=node_id,
                    title=str(data.get("title") or data.get("label") or node_id),
                    description=str(data.get("description") or ""),
                    expected_output=str(data.get("expectedOutput") or ""),
                    agent_id=None,
                    requires_approval=bool(data.get("requiresApproval")),
                ),
            )
        elif ntype == "tool":
            tool = GraphTool(
                id=node_id,
                name=str(data.get("label") or node_id),
                tool_name=str(data.get("toolName") or "web_search"),
                permissions=list(data.get("permissions") or []),
            )
            tools.append(tool)
            tool_nodes_by_id[node_id] = tool

    task_by_id = {t.id: t for t in tasks}
    agent_tools: dict[str, list[str]] = defaultdict(list)

    normalized_edges = [
        {"id": str(e.get("id", "")), "source": str(e["source"]), "target": str(e["target"])}
        for e in edges
        if e.get("source") and e.get("target")
    ]

    for edge in normalized_edges:
        source = edge["source"]
        target = edge["target"]
        if source in agent_ids and target in task_by_id:
            task_by_id[target].agent_id = source
        if source in task_by_id and target in tool_nodes_by_id:
            agent_tools[task_by_id[source].agent_id or ""].append(
                tool_nodes_by_id[target].tool_name,
            )
        if source in agent_ids and target in tool_nodes_by_id:
            agent_tools[source].append(tool_nodes_by_id[target].tool_name)

    for agent in agents:
        agent.tool_ids = list(dict.fromkeys(agent_tools.get(agent.id, [])))

    ordered_tasks = _topological_task_order(tasks, normalized_edges, agent_ids)

    return ParsedWorkflowGraph(
        agents=agents,
        tasks=ordered_tasks,
        tools=tools,
        edges=normalized_edges,
    )


def _topological_task_order(
    tasks: list[GraphTask],
    edges: list[dict[str, str]],
    agent_ids: set[str],
) -> list[GraphTask]:
    task_ids = {t.id for t in tasks}
    indegree: dict[str, int] = {t.id: 0 for t in tasks}
    adj: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        src, tgt = edge["source"], edge["target"]
        if src in task_ids and tgt in task_ids:
            adj[src].append(tgt)
            indegree[tgt] += 1
        elif src in agent_ids and tgt in task_ids:
            pass

    queue = deque([tid for tid, deg in indegree.items() if deg == 0])
    ordered_ids: list[str] = []

    while queue:
        current = queue.popleft()
        ordered_ids.append(current)
        for nxt in adj[current]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    remaining = [t.id for t in tasks if t.id not in ordered_ids]
    ordered_ids.extend(remaining)

    task_map = {t.id: t for t in tasks}
    result: list[GraphTask] = []
    for index, task_id in enumerate(ordered_ids):
        if task_id in task_map:
            task = task_map[task_id]
            task.order = index
            result.append(task)
    return result
