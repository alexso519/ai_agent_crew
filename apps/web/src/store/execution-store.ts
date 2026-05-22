import { create } from "zustand";

import type { ExecutionLogLine } from "@/types/execution";
import type { ExecutionStatus } from "@crewcc/shared-types";

interface ExecutionState {
  executionId: string | null;
  workflowId: string | null;
  status: ExecutionStatus;
  logs: ExecutionLogLine[];
  streamConnected: boolean;
  error: string | null;
  setExecution: (
    executionId: string,
    workflowId: string,
    status: ExecutionStatus,
  ) => void;
  setStatus: (status: ExecutionStatus) => void;
  setStreamConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  appendLog: (line: ExecutionLogLine) => void;
  setLogs: (lines: ExecutionLogLine[]) => void;
  clearLogs: () => void;
  reset: () => void;
}

let logCounter = 0;

export const useExecutionStore = create<ExecutionState>((set) => ({
  executionId: null,
  workflowId: null,
  status: "pending",
  logs: [],
  streamConnected: false,
  error: null,
  setExecution: (executionId, workflowId, status) =>
    set({ executionId, workflowId, status, error: null }),
  setStatus: (status) => set({ status }),
  setStreamConnected: (streamConnected) => set({ streamConnected }),
  setError: (error) => set({ error }),
  appendLog: (line) =>
    set((state) => {
      const id = line.id || `log-${++logCounter}`;
      if (state.logs.some((l) => l.id === id)) return state;
      return {
        logs: [...state.logs, { ...line, id }],
      };
    }),
  setLogs: (logs) => set({ logs }),
  clearLogs: () => set({ logs: [] }),
  reset: () =>
    set({
      executionId: null,
      workflowId: null,
      status: "pending",
      logs: [],
      streamConnected: false,
      error: null,
    }),
}));
