import type { CrewNode, CrewNodeData } from "@/types/workflow";
import type { CrewNodeType } from "@/types/workflow";

const AGENT_PRESETS: Record<string, { role: string; goal: string }> = {
  "Research Agent": {
    role: "Senior Research Analyst",
    goal: "Gather and synthesize accurate information from diverse sources.",
  },
  "Engineer Agent": {
    role: "Software Engineer",
    goal: "Design and implement robust, maintainable solutions.",
  },
  "QA Agent": {
    role: "Quality Assurance Engineer",
    goal: "Validate outputs against requirements and catch regressions.",
  },
  "PM Agent": {
    role: "Project Manager",
    goal: "Coordinate tasks, timelines, and stakeholder expectations.",
  },
  "Analyst Agent": {
    role: "Business Analyst",
    goal: "Translate business needs into actionable technical requirements.",
  },
};

const TASK_PRESETS: Record<string, { title: string; requiresApproval: boolean }> = {
  "Sequential Task": { title: "Sequential Step", requiresApproval: false },
  "Conditional Task": { title: "Conditional Branch", requiresApproval: false },
  "Human Approval Task": { title: "Human Review", requiresApproval: true },
  "Retry Task": { title: "Retry on Failure", requiresApproval: false },
};

const TOOL_PRESETS: Record<string, { toolName: string; permissions: string[] }> = {
  "Web Search": { toolName: "web_search", permissions: ["network"] },
  SQL: { toolName: "sql_executor", permissions: ["database:read"] },
  "API Connector": { toolName: "api_connector", permissions: ["network", "secrets"] },
  "File Reader": { toolName: "file_reader", permissions: ["filesystem:read"] },
  "Python Executor": { toolName: "python_executor", permissions: ["sandbox:execute"] },
  "Vector Search": { toolName: "vector_search", permissions: ["vector:query"] },
};

export function resolveTemplateType(label: string): CrewNodeType | null {
  if (label in AGENT_PRESETS) return "agent";
  if (label in TASK_PRESETS) return "task";
  if (label in TOOL_PRESETS) return "tool";
  return null;
}

export function createNodeFromTemplate(
  templateLabel: string,
  position: { x: number; y: number },
): CrewNode {
  const id = `${resolveTemplateType(templateLabel) ?? "node"}-${crypto.randomUUID().slice(0, 8)}`;
  const nodeType = resolveTemplateType(templateLabel);

  let data: CrewNodeData;

  if (nodeType === "agent") {
    const preset = AGENT_PRESETS[templateLabel];
    data = {
      nodeType: "agent",
      label: templateLabel,
      role: preset.role,
      goal: preset.goal,
      backstory: "",
      llmProvider: "ollama",
      llmModel: "llama3",
      temperature: 0.7,
      maxTokens: 4096,
      iterations: 10,
      rpmLimit: 60,
      memoryShortTerm: true,
      memoryLongTerm: false,
      memoryEntity: false,
      status: "idle",
      tokenCount: 0,
    };
  } else if (nodeType === "task") {
    const preset = TASK_PRESETS[templateLabel];
    data = {
      nodeType: "task",
      label: templateLabel,
      title: preset.title,
      description: "",
      expectedOutput: "",
      timeoutSeconds: 300,
      maxRetries: templateLabel === "Retry Task" ? 3 : 0,
      requiresApproval: preset.requiresApproval,
      priority: 0,
      progress: 0,
      status: preset.requiresApproval ? "waiting-human" : "idle",
    };
  } else if (nodeType === "tool") {
    const preset = TOOL_PRESETS[templateLabel];
    data = {
      nodeType: "tool",
      label: templateLabel,
      toolName: preset.toolName,
      permissions: preset.permissions,
      status: "idle",
    };
  } else {
    data = {
      nodeType: "agent",
      label: templateLabel,
      role: templateLabel,
      goal: "",
      backstory: "",
      llmProvider: "ollama",
      llmModel: "llama3",
      temperature: 0.7,
      maxTokens: 4096,
      iterations: 10,
      rpmLimit: 60,
      memoryShortTerm: false,
      memoryLongTerm: false,
      memoryEntity: false,
      status: "idle",
      tokenCount: 0,
    };
  }

  return {
    id,
    type: data.nodeType,
    position,
    data,
  };
}
