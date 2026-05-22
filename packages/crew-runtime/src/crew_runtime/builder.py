from typing import Any

from crewai import Agent, Crew, Process, Task

from crew_runtime.graph import GraphAgent, GraphTask, ParsedWorkflowGraph
from crew_runtime.llm_factory import build_llm, memory_enabled_flags
from crew_runtime.tools import resolve_tools


class CrewBuilder:
    """Construct CrewAI agents, tasks, and crews from a parsed workflow graph."""

    def __init__(self, ollama_base_url: str | None = None) -> None:
        self._ollama_base_url = ollama_base_url

    def build_agent(self, spec: GraphAgent) -> Agent:
        llm = build_llm(
            spec.llm_provider,
            spec.llm_model,
            temperature=spec.temperature,
            base_url=self._ollama_base_url,
        )
        tools = resolve_tools(spec.tool_ids)
        return Agent(
            role=spec.role,
            goal=spec.goal or f"Perform duties as {spec.role}",
            backstory=spec.backstory or f"Expert {spec.role} on the crew.",
            llm=llm,
            tools=tools,
            verbose=True,
            memory=memory_enabled_flags(spec.memory),
            max_iter=spec.iterations,
            max_rpm=spec.rpm_limit,
        )

    def build_task(
        self,
        spec: GraphTask,
        agent: Agent | None,
        context_tasks: list[Task] | None = None,
    ) -> Task:
        return Task(
            description=spec.description or spec.title,
            expected_output=spec.expected_output or f"Completed: {spec.title}",
            agent=agent,
            async_execution=False,
            context=context_tasks or [],
        )

    def build_single_task_crew(
        self,
        agent: Agent,
        task: Task,
    ) -> Crew:
        return Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=True,
        )

    def build_from_graph(self, graph: ParsedWorkflowGraph) -> tuple[dict[str, Agent], list[tuple[GraphTask, Agent | None, Task]]]:
        agents_by_id: dict[str, Agent] = {}
        for spec in graph.agents:
            agents_by_id[spec.id] = self.build_agent(spec)

        default_agent = next(iter(agents_by_id.values()), None)
        built_tasks: list[tuple[GraphTask, Agent | None, Task]] = []
        prior_crew_tasks: list[Task] = []

        for spec in graph.tasks:
            agent = agents_by_id.get(spec.agent_id or "") if spec.agent_id else default_agent
            crew_task = self.build_task(spec, agent, context_tasks=prior_crew_tasks.copy())
            built_tasks.append((spec, agent, crew_task))
            prior_crew_tasks.append(crew_task)

        return agents_by_id, built_tasks
