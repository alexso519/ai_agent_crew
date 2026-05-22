import type { NodeStatus } from "@crewcc/shared-types";

export const STATUS_RING: Record<NodeStatus, string> = {
  idle: "ring-muted-foreground/30",
  running: "ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse",
  success: "ring-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  failed: "ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]",
  "waiting-human": "ring-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]",
};

export const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "Idle",
  running: "Running",
  success: "Success",
  failed: "Failed",
  "waiting-human": "Awaiting human",
};
