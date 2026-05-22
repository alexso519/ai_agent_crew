import { apiRequest } from "@/lib/api-client";
import type {
  ExecutionStatusResult,
  WorkflowRunPayload,
  WorkflowRunResult,
} from "@/types/execution";

export async function runWorkflow(
  token: string,
  payload: WorkflowRunPayload,
): Promise<WorkflowRunResult> {
  return apiRequest<WorkflowRunResult>("/workflow/run", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function getExecutionStatus(
  token: string,
  executionId: string,
): Promise<ExecutionStatusResult> {
  return apiRequest<ExecutionStatusResult>(`/workflow/status/${executionId}`, {
    method: "GET",
    token,
  });
}

export async function pauseWorkflow(
  token: string,
  executionId: string,
): Promise<ExecutionStatusResult> {
  return apiRequest<ExecutionStatusResult>("/workflow/pause", {
    method: "POST",
    token,
    body: { execution_id: executionId },
  });
}

export async function resumeWorkflow(
  token: string,
  executionId: string,
): Promise<WorkflowRunResult> {
  return apiRequest<WorkflowRunResult>("/workflow/resume", {
    method: "POST",
    token,
    body: { execution_id: executionId },
  });
}

export async function killWorkflow(
  token: string,
  executionId: string,
): Promise<ExecutionStatusResult> {
  return apiRequest<ExecutionStatusResult>("/workflow/kill", {
    method: "POST",
    token,
    body: { execution_id: executionId },
  });
}

export async function replayWorkflow(
  token: string,
  executionId: string,
  fromCheckpoint = true,
): Promise<WorkflowRunResult> {
  const query = fromCheckpoint ? "" : "?from_checkpoint=false";
  return apiRequest<WorkflowRunResult>(
    `/workflow/replay/${executionId}${query}`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}

export async function retryWorkflow(
  token: string,
  executionId: string,
): Promise<WorkflowRunResult> {
  return apiRequest<WorkflowRunResult>(`/workflow/retry/${executionId}`, {
    method: "POST",
    token,
    body: {},
  });
}
