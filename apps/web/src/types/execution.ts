import type { ExecutionStatus } from "@crewcc/shared-types";

export type LogTag =
  | "Planning"
  | "Thought"
  | "Action"
  | "Observation"
  | "Tool"
  | "Error";

export interface ExecutionLogLine {
  id: string;
  tag: LogTag;
  message: string;
  agentId: string | null;
  taskId: string | null;
  timestamp: string;
  tokenCount?: number;
}

export interface WorkflowRunPayload {
  workflow_id?: string | null;
  name: string;
  description: string;
  graph_definition: {
    nodes: unknown[];
    edges: unknown[];
    yaml: Record<string, string>;
  };
  inputs?: Record<string, unknown>;
}

export interface WorkflowRunResult {
  execution_id: string;
  workflow_id: string;
  status: ExecutionStatus;
  celery_task_id: string | null;
}

export interface ExecutionStatusResult {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  error_message: string | null;
  checkpoint: Record<string, unknown>;
  celery_task_id: string | null;
}
