import yaml from "js-yaml";
import type { Edge, Node } from "@xyflow/react";

import {
  agentsYamlSchema,
  tasksYamlSchema,
  workflowYamlSchema,
  type AgentsYaml,
  type TasksYaml,
  type WorkflowYaml,
} from "@/lib/workflow/schemas";
import type {
  AgentNodeData,
  CrewNode,
  CrewNodeData,
  TaskNodeData,
  ToolNodeData,
  YamlBundle,
} from "@/types/workflow";
import type { YamlFileKey } from "@crewcc/shared-types";

function dumpDoc(doc: unknown): string {
  return yaml.dump(doc, { lineWidth: 100, noRefs: true }).trim() + "\n";
}

export function graphToYaml(
  nodes: Node<CrewNodeData>[],
  edges: Edge[],
  workflowName: string,
  workflowDescription: string,
  layoutMode: "hierarchy" | "sequential",
): YamlBundle {
  const agentNodes = nodes.filter((n) => n.data.nodeType === "agent");
  const taskNodes = nodes.filter((n) => n.data.nodeType === "task");

  const agentsDoc: AgentsYaml = {
    agents: agentNodes.map((n) => {
      const d = n.data as AgentNodeData;
      return {
        id: n.id,
        name: d.label,
        role: d.role,
        goal: d.goal,
        backstory: d.backstory,
        llm_provider: d.llmProvider,
        llm_model: d.llmModel,
        temperature: d.temperature,
        max_tokens: d.maxTokens,
        iterations: d.iterations,
        rpm_limit: d.rpmLimit,
        memory: {
          short_term: d.memoryShortTerm,
          long_term: d.memoryLongTerm,
          entity: d.memoryEntity,
        },
      };
    }),
  };

  const tasksDoc: TasksYaml = {
    tasks: taskNodes.map((n) => {
      const d = n.data as TaskNodeData;
      const parentEdge = edges.find((e) => e.target === n.id);
      return {
        id: n.id,
        title: d.title,
        description: d.description,
        expected_output: d.expectedOutput,
        timeout_seconds: d.timeoutSeconds,
        max_retries: d.maxRetries,
        requires_approval: d.requiresApproval,
        priority: d.priority,
        agent_id: parentEdge?.source,
      };
    }),
  };

  const workflowDoc: WorkflowYaml = {
    name: workflowName,
    description: workflowDescription,
    layout: layoutMode,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };

  return {
    agents: dumpDoc(agentsDoc),
    tasks: dumpDoc(tasksDoc),
    workflow: dumpDoc(workflowDoc),
  };
}

function parseYaml<T>(content: string, schema: { parse: (v: unknown) => T }): T {
  const raw = yaml.load(content);
  return schema.parse(raw);
}

export function parseAgentsYaml(content: string): AgentsYaml {
  return parseYaml(content, agentsYamlSchema);
}

export function parseTasksYaml(content: string): TasksYaml {
  return parseYaml(content, tasksYamlSchema);
}

export function parseWorkflowYaml(content: string): WorkflowYaml {
  return parseYaml(content, workflowYamlSchema);
}

function buildAgentNode(
  entry: AgentsYaml["agents"][number],
  position: { x: number; y: number },
): CrewNode {
  return {
    id: entry.id,
    type: "agent",
    position,
    data: {
      nodeType: "agent",
      label: entry.name,
      role: entry.role,
      goal: entry.goal,
      backstory: entry.backstory,
      llmProvider: entry.llm_provider,
      llmModel: entry.llm_model,
      temperature: entry.temperature,
      maxTokens: entry.max_tokens,
      iterations: entry.iterations,
      rpmLimit: entry.rpm_limit,
      memoryShortTerm: entry.memory.short_term,
      memoryLongTerm: entry.memory.long_term,
      memoryEntity: entry.memory.entity,
      status: "idle",
      tokenCount: 0,
    },
  };
}

function buildTaskNode(
  entry: TasksYaml["tasks"][number],
  position: { x: number; y: number },
): CrewNode {
  return {
    id: entry.id,
    type: "task",
    position,
    data: {
      nodeType: "task",
      label: entry.title,
      title: entry.title,
      description: entry.description,
      expectedOutput: entry.expected_output,
      timeoutSeconds: entry.timeout_seconds,
      maxRetries: entry.max_retries,
      requiresApproval: entry.requires_approval,
      priority: entry.priority,
      progress: 0,
      status: entry.requires_approval ? "waiting-human" : "idle",
    },
  };
}

function buildToolNode(
  id: string,
  label: string,
  position: { x: number; y: number },
): CrewNode {
  return {
    id,
    type: "tool",
    position,
    data: {
      nodeType: "tool",
      label,
      toolName: label.toLowerCase().replace(/\s+/g, "_"),
      permissions: [],
      status: "idle",
    },
  };
}

export function mergeYamlIntoGraph(
  currentNodes: Node<CrewNodeData>[],
  currentEdges: Edge[],
  file: YamlFileKey,
  content: string,
  workflowMeta: { name: string; description: string; layoutMode: "hierarchy" | "sequential" },
): { nodes: CrewNode[]; edges: Edge[]; meta?: { name: string; description: string; layoutMode: "hierarchy" | "sequential" } } {
  const positionById = new Map(
    currentNodes.map((n) => [n.id, n.position] as const),
  );

  if (file === "agents") {
    const doc = parseAgentsYaml(content);
    const others = currentNodes.filter((n) => n.data.nodeType !== "agent");
    const agents = doc.agents.map((entry, index) =>
      buildAgentNode(entry, positionById.get(entry.id) ?? { x: 80, y: 80 + index * 120 }),
    );
    return { nodes: [...others, ...agents], edges: currentEdges };
  }

  if (file === "tasks") {
    const doc = parseTasksYaml(content);
    const others = currentNodes.filter((n) => n.data.nodeType !== "task");
    const tasks = doc.tasks.map((entry, index) =>
      buildTaskNode(entry, positionById.get(entry.id) ?? { x: 360, y: 80 + index * 120 }),
    );
    const taskEdges: Edge[] = doc.tasks
      .filter((t) => t.agent_id)
      .map((t) => ({
        id: `e-${t.agent_id}-${t.id}`,
        source: t.agent_id!,
        target: t.id,
        type: "animated",
      }));
    const nonTaskEdges = currentEdges.filter(
      (e) => !tasks.some((t) => t.id === e.target),
    );
    return { nodes: [...others, ...tasks], edges: [...nonTaskEdges, ...taskEdges] };
  }

  const doc = parseWorkflowYaml(content);
  const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));
  const rebuilt: CrewNode[] = doc.nodes.map((meta) => {
    const existing = nodeMap.get(meta.id);
    if (existing) {
      return { ...existing, position: meta.position };
    }
    if (meta.type === "tool") {
      return buildToolNode(meta.id, meta.id, meta.position);
    }
    if (meta.type === "task") {
      return buildTaskNode(
        {
          id: meta.id,
          title: meta.id,
          description: "",
          expected_output: "",
          timeout_seconds: 300,
          max_retries: 0,
          requires_approval: false,
          priority: 0,
        },
        meta.position,
      );
    }
    return buildAgentNode(
      {
        id: meta.id,
        name: meta.id,
        role: "Agent",
        goal: "",
        backstory: "",
        llm_provider: "ollama",
        llm_model: "llama3",
        temperature: 0.7,
        max_tokens: 4096,
        iterations: 10,
        rpm_limit: 60,
        memory: { short_term: false, long_term: false, entity: false },
      },
      meta.position,
    );
  });

  const edges: Edge[] = doc.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "animated",
  }));

  return {
    nodes: rebuilt,
    edges,
    meta: {
      name: doc.name,
      description: doc.description,
      layoutMode: doc.layout,
    },
  };
}

export function validateYamlFile(
  file: YamlFileKey,
  content: string,
): { ok: true } | { ok: false; error: string } {
  try {
    if (file === "agents") parseAgentsYaml(content);
    else if (file === "tasks") parseTasksYaml(content);
    else parseWorkflowYaml(content);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid YAML";
    return { ok: false, error: message };
  }
}
