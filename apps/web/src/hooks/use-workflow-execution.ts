"use client";

import { useCallback, useEffect } from "react";

import { useExecutionStream } from "@/hooks/use-execution-stream";
import {
  getExecutionStatus,
  killWorkflow,
  pauseWorkflow,
  replayWorkflow,
  resumeWorkflow,
  retryWorkflow,
  runWorkflow,
} from "@/services/workflow-service";
import { useAuthStore } from "@/store/auth-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useExecutionStore } from "@/store/execution-store";
import { useUiStore } from "@/store/ui-store";
import { useWorkflowStore } from "@/store/workflow-store";
import type { CrewNodeData } from "@/types/workflow";
import type { NodeStatus } from "@crewcc/shared-types";

function setAllNodeStatus(status: NodeStatus) {
  const nodes = useCanvasStore.getState().nodes;
  for (const node of nodes) {
    useCanvasStore.getState().updateNodeData(node.id, { status } as Partial<CrewNodeData>);
  }
}

export function useWorkflowExecution() {
  const token = useAuthStore((s) => s.token);
  const { workflow } = useWorkflowStore();
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const yaml = useCanvasStore((s) => s.yaml);
  const {
    executionId,
    status,
    setExecution,
    setStatus,
    setError,
    clearLogs,
    reset,
  } = useExecutionStore();

  useExecutionStream();

  const refreshStatus = useCallback(async () => {
    if (!token || !executionId) return;
    const result = await getExecutionStatus(token, executionId);
    setStatus(result.status);
    if (result.status === "success") {
      useCanvasStore.getState().nodes.forEach((node) => {
        useCanvasStore.getState().updateNodeData(node.id, {
          status: "success",
        } as Partial<CrewNodeData>);
      });
    }
    if (result.status === "failed") {
      setAllNodeStatus("failed");
    }
  }, [token, executionId, setStatus]);

  useEffect(() => {
    if (!token || !executionId) return;
    if (status !== "running" && status !== "pending") return;

    const interval = setInterval(() => {
      void refreshStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [token, executionId, status, refreshStatus]);

  const buildPayload = useCallback(
    () => ({
      name: workflow.name,
      description: workflow.description,
      graph_definition: {
        nodes,
        edges,
        yaml: { agents: yaml.agents, tasks: yaml.tasks, workflow: yaml.workflow },
      },
      inputs: {},
    }),
    [workflow.name, workflow.description, nodes, edges, yaml],
  );

  const run = useCallback(async () => {
    if (!token) return;
    clearLogs();
    setAllNodeStatus("idle");
    setError(null);
    try {
      const result = await runWorkflow(token, buildPayload());
      setExecution(result.execution_id, result.workflow_id, result.status);
      setStatus(result.status === "pending" ? "running" : result.status);
      setAllNodeStatus("running");
      useUiStore.getState().setBottomPanelTab("terminal");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Run failed";
      setError(message);
      setStatus("failed");
    }
  }, [token, buildPayload, clearLogs, setExecution, setStatus, setError]);

  const pause = useCallback(async () => {
    if (!token || !executionId) return;
    try {
      const result = await pauseWorkflow(token, executionId);
      setStatus(result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pause failed");
    }
  }, [token, executionId, setStatus, setError]);

  const resume = useCallback(async () => {
    if (!token || !executionId) return;
    try {
      const result = await resumeWorkflow(token, executionId);
      setExecution(result.execution_id, result.workflow_id, result.status);
      setStatus("running");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume failed");
    }
  }, [token, executionId, setExecution, setStatus, setError]);

  const kill = useCallback(async () => {
    if (!token || !executionId) return;
    try {
      const result = await killWorkflow(token, executionId);
      setStatus(result.status);
      setAllNodeStatus("failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    }
  }, [token, executionId, setStatus, setError]);

  const replay = useCallback(async () => {
    if (!token || !executionId) return;
    clearLogs();
    try {
      const result = await replayWorkflow(token, executionId, true);
      setExecution(result.execution_id, result.workflow_id, result.status);
      setStatus("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed");
    }
  }, [token, executionId, clearLogs, setExecution, setStatus, setError]);

  const retry = useCallback(async () => {
    if (!token || !executionId) return;
    clearLogs();
    try {
      const result = await retryWorkflow(token, executionId);
      setExecution(result.execution_id, result.workflow_id, result.status);
      setStatus("running");
      useUiStore.getState().setBottomPanelTab("terminal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  }, [token, executionId, clearLogs, setExecution, setStatus, setError]);

  return {
    executionId,
    status,
    run,
    pause,
    resume,
    kill,
    replay,
    retry,
    refreshStatus,
    reset,
    canRun: status !== "running",
    canPause: status === "running",
    canResume: status === "suspended" || status === "failed",
    canKill: status === "running" || status === "suspended" || status === "pending",
    canReplay: Boolean(executionId),
    canRetry: status === "failed" || status === "suspended",
  };
}
