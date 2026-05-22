import { apiRequest } from "@/lib/api-client";

export interface TokenSeriesItem {
  id: string;
  label: string;
  tokens: number;
  estimated_cost_usd: number;
}

export interface TimelineItem {
  task_id: string;
  task_label: string;
  agent_id: string | null;
  start: string;
  end: string;
  status: string;
  duration_ms: number;
}

export interface HeatmapCell {
  hour: string;
  failures: number;
  executions: number;
}

export interface ExecutionMetrics {
  execution_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  token_usage: Record<string, unknown>;
  tokens_by_agent: TokenSeriesItem[];
  tokens_by_task: TokenSeriesItem[];
  workflow_total_tokens: number;
  workflow_estimated_cost_usd: number;
  timeline: TimelineItem[];
  failure_heatmap: HeatmapCell[];
  error_count: number;
  snapshot_count: number;
}

export interface SnapshotItem {
  id: string;
  execution_id: string;
  label: string;
  created_at: string;
}

export async function fetchExecutionMetrics(
  token: string,
  executionId: string,
): Promise<ExecutionMetrics> {
  return apiRequest<ExecutionMetrics>(`/workflow/metrics/${executionId}`, {
    method: "GET",
    token,
  });
}

export async function fetchSnapshots(
  token: string,
  executionId: string,
): Promise<SnapshotItem[]> {
  return apiRequest<SnapshotItem[]>(`/workflow/snapshots/${executionId}`, {
    method: "GET",
    token,
  });
}

export async function createSnapshot(
  token: string,
  executionId: string,
  label: string,
): Promise<SnapshotItem> {
  return apiRequest<SnapshotItem>(`/workflow/snapshots/${executionId}`, {
    method: "POST",
    token,
    body: { label },
  });
}

export async function rollbackSnapshot(
  token: string,
  snapshotId: string,
): Promise<{ execution_id: string; message: string }> {
  return apiRequest(`/workflow/snapshot/${snapshotId}/rollback`, {
    method: "POST",
    token,
    body: {},
  });
}
