import { create } from "zustand";

export interface WorkflowMeta {
  id: string | null;
  name: string;
  description: string;
  isDirty: boolean;
}

interface WorkflowState {
  workflow: WorkflowMeta;
  selectedNodeId: string | null;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  markDirty: () => void;
  resetWorkflow: () => void;
}

const EMPTY_WORKFLOW: WorkflowMeta = {
  id: null,
  name: "Untitled Workflow",
  description: "",
  isDirty: false,
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: EMPTY_WORKFLOW,
  selectedNodeId: null,
  setWorkflowName: (name) =>
    set((state) => ({
      workflow: { ...state.workflow, name, isDirty: true },
    })),
  setWorkflowDescription: (description) =>
    set((state) => ({
      workflow: { ...state.workflow, description, isDirty: true },
    })),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  markDirty: () =>
    set((state) => ({
      workflow: { ...state.workflow, isDirty: true },
    })),
  resetWorkflow: () =>
    set({ workflow: EMPTY_WORKFLOW, selectedNodeId: null }),
}));
