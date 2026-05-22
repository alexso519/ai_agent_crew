import { apiRequest } from "@/lib/api-client";
import type { ExecutionLogLine, LogTag } from "@/types/execution";

interface LogEntryApi {
  id: string;
  tag: string;
  message: string;
  agent_id: string | null;
  task_id: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface LogListApi {
  execution_id: string;
  total: number;
  entries: LogEntryApi[];
}

function mapEntry(e: LogEntryApi): ExecutionLogLine {
  return {
    id: e.id,
    tag: e.tag as LogTag,
    message: e.message,
    agentId: e.agent_id,
    taskId: e.task_id,
    timestamp: e.timestamp,
  };
}

export async function fetchExecutionLogs(
  token: string,
  executionId: string,
  params?: {
    tag?: string;
    agent_id?: string;
    task_id?: string;
    search?: string;
  },
): Promise<ExecutionLogLine[]> {
  const query = new URLSearchParams();
  if (params?.tag) query.set("tag", params.tag);
  if (params?.agent_id) query.set("agent_id", params.agent_id);
  if (params?.task_id) query.set("task_id", params.task_id);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  const res = await apiRequest<LogListApi>(
    `/workflow/logs/${executionId}${qs ? `?${qs}` : ""}`,
    { method: "GET", token },
  );
  return res.entries.map(mapEntry);
}

export function exportLogsUrl(executionId: string, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
  return `${base}/workflow/logs/${executionId}/export?token=${encodeURIComponent(token)}`;
}
