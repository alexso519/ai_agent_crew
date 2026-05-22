import type {
  CanvasLayoutMode,
  LlmProvider,
  NodeStatus,
  YamlFileKey,
} from "@crewcc/shared-types";
import type { Edge, Node } from "@xyflow/react";

export type CrewNodeType = "agent" | "task" | "tool";

export interface AgentNodeData {
  nodeType: "agent";
  label: string;
  role: string;
  goal: string;
  backstory: string;
  llmProvider: LlmProvider;
  llmModel: string;
  temperature: number;
  maxTokens: number;
  iterations: number;
  rpmLimit: number;
  memoryShortTerm: boolean;
  memoryLongTerm: boolean;
  memoryEntity: boolean;
  status: NodeStatus;
  tokenCount: number;
  [key: string]: unknown;
}

export interface TaskNodeData {
  nodeType: "task";
  label: string;
  title: string;
  description: string;
  expectedOutput: string;
  timeoutSeconds: number;
  maxRetries: number;
  requiresApproval: boolean;
  priority: number;
  progress: number;
  status: NodeStatus;
  [key: string]: unknown;
}

export interface ToolNodeData {
  nodeType: "tool";
  label: string;
  toolName: string;
  permissions: string[];
  status: NodeStatus;
  [key: string]: unknown;
}

export type CrewNodeData = AgentNodeData | TaskNodeData | ToolNodeData;

export type CrewNode = Node<CrewNodeData>;
export type CrewEdge = Edge;

export interface YamlBundle {
  agents: string;
  tasks: string;
  workflow: string;
}

export interface CanvasViewState {
  activeYamlFile: YamlFileKey;
  layoutMode: CanvasLayoutMode;
  yamlSyncError: string | null;
}
