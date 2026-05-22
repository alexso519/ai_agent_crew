export type UserRole = "admin" | "operator" | "reviewer" | "viewer";

export type ExecutionStatus =
  | "pending"
  | "running"
  | "suspended"
  | "failed"
  | "success";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface TokenPair {
  accessToken: string;
  tokenType: "bearer";
}

export type SidebarTab = "agents" | "tasks" | "tools" | "templates";

export type BottomPanelTab = "terminal" | "metrics" | "yaml";

export type YamlFileKey = "agents" | "tasks" | "workflow";

export type CanvasLayoutMode = "hierarchy" | "sequential";

export type NodeStatus =
  | "idle"
  | "running"
  | "success"
  | "failed"
  | "waiting-human";

export type LlmProvider = "gpt" | "claude" | "gemini" | "ollama";
