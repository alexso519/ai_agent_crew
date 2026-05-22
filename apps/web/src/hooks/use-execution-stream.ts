"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAuthStore } from "@/store/auth-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useExecutionStore } from "@/store/execution-store";
import type { ExecutionLogLine, LogTag } from "@/types/execution";
import type { ExecutionStatus, NodeStatus } from "@crewcc/shared-types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const TAG_SET = new Set<string>([
  "Planning",
  "Thought",
  "Action",
  "Observation",
  "Tool",
  "Error",
]);

function mapTag(tag: string): LogTag {
  return TAG_SET.has(tag) ? (tag as LogTag) : "Action";
}

function statusFromEvent(tag: string, payload: Record<string, unknown>): NodeStatus | null {
  if (payload.status === "running") return "running";
  if (tag === "Error") return "failed";
      if (payload.requires_approval) return "waiting-human";
      if (payload.approval_id) return "waiting-human";
  if (tag === "Observation") return "success";
  if (tag === "Action" && String(payload.phase) === "start") return "running";
  return null;
}

export function useExecutionStream() {
  const token = useAuthStore((s) => s.token);
  const executionId = useExecutionStore((s) => s.executionId);
  const appendLog = useExecutionStore((s) => s.appendLog);
  const setStreamConnected = useExecutionStore((s) => s.setStreamConnected);
  const setStatus = useExecutionStore((s) => s.setStatus);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback(
    (raw: Record<string, unknown>) => {
      const payload = (raw.payload as Record<string, unknown>) ?? {};
      if (payload.type === "heartbeat") return;

      const tag = mapTag(String(raw.tag ?? "Action"));
      const tokenCount =
        typeof raw.token_count === "number"
          ? raw.token_count
          : typeof payload.token_count === "number"
            ? (payload.token_count as number)
            : undefined;

      const line: ExecutionLogLine = {
        id: String(raw.id ?? crypto.randomUUID()),
        tag,
        message: String(raw.message ?? ""),
        agentId: raw.agent_id ? String(raw.agent_id) : null,
        taskId: raw.task_id ? String(raw.task_id) : null,
        timestamp: String(raw.timestamp ?? new Date().toISOString()),
        tokenCount,
      };
      appendLog(line);

      if (payload.status) {
        setStatus(payload.status as ExecutionStatus);
      }
      if (payload.requires_approval || payload.approval_id) {
        setStatus("suspended");
      }
      if (line.agentId) {
        const nodeStatus = statusFromEvent(tag, payload);
        const patch: Record<string, unknown> = {};
        if (nodeStatus) patch.status = nodeStatus;
        if (tokenCount !== undefined) patch.tokenCount = tokenCount;
        if (Object.keys(patch).length > 0) {
          updateNodeData(line.agentId, patch);
        }
      }
      if (line.taskId && tag === "Observation") {
        updateNodeData(line.taskId, { status: "success", progress: 100 });
      }
      if (line.taskId && tag === "Action") {
        updateNodeData(line.taskId, { status: "running" });
      }
    },
    [appendLog, setStatus, updateNodeData],
  );

  const connect = useCallback(() => {
    if (!token || !executionId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/workflow/stream/${executionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body) {
          throw new Error(`Stream failed (${response.status})`);
        }
        setStreamConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part
              .split("\n")
              .find((l) => l.startsWith("data:"));
            if (!line) continue;
            const json = line.replace(/^data:\s*/, "");
            try {
              handleEvent(JSON.parse(json) as Record<string, unknown>);
            } catch {
              /* skip malformed */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[execution-stream]", err);
        }
      } finally {
        setStreamConnected(false);
      }
    })();
  }, [token, executionId, handleEvent, setStreamConnected]);

  const disconnect = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamConnected(false);
  }, [setStreamConnected]);

  useEffect(() => {
    if (executionId && token) {
      connect();
    }
    return () => disconnect();
  }, [executionId, token, connect, disconnect]);

  return { connect, disconnect };
}
