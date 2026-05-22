import { apiRequest } from "@/lib/api-client";

export interface ApprovalSummary {
  id: string;
  execution_id: string;
  status: string;
  task_title: string;
  agent_label: string;
  draft_preview: string;
  created_at: string;
}

export interface ApprovalDetail {
  id: string;
  execution_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  task_node_id: string;
  task_title: string;
  agent_node_id: string | null;
  agent_label: string;
  ai_draft: string | null;
  human_edit: string | null;
  instructions: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export async function fetchPendingCount(token: string): Promise<number> {
  const res = await apiRequest<{ pending: number }>("/approvals/count", {
    method: "GET",
    token,
  });
  return res.pending;
}

export async function fetchApprovals(token: string): Promise<ApprovalSummary[]> {
  return apiRequest<ApprovalSummary[]>("/approvals", { method: "GET", token });
}

export async function fetchApproval(
  token: string,
  approvalId: string,
): Promise<ApprovalDetail> {
  return apiRequest<ApprovalDetail>(`/approvals/${approvalId}`, {
    method: "GET",
    token,
  });
}

export async function approveApproval(
  token: string,
  approvalId: string,
  body: { human_edit?: string; instructions?: string },
): Promise<ApprovalDetail> {
  return apiRequest<ApprovalDetail>(`/approvals/${approvalId}/approve`, {
    method: "POST",
    token,
    body,
  });
}

export async function rejectApproval(
  token: string,
  approvalId: string,
  reason: string,
): Promise<ApprovalDetail> {
  return apiRequest<ApprovalDetail>(`/approvals/${approvalId}/reject`, {
    method: "POST",
    token,
    body: { reason },
  });
}

export async function regenerateApproval(
  token: string,
  approvalId: string,
): Promise<ApprovalDetail> {
  return apiRequest<ApprovalDetail>(`/approvals/${approvalId}/regenerate`, {
    method: "POST",
    token,
    body: {},
  });
}

export async function resumeFromApproval(
  token: string,
  approvalId: string,
  body: { human_edit?: string; instructions?: string },
): Promise<{ execution_id: string; status: string; message: string }> {
  return apiRequest(`/approvals/${approvalId}/resume`, {
    method: "POST",
    token,
    body,
  });
}
