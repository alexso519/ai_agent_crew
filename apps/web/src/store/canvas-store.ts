import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";

import { applyAutoLayout } from "@/lib/workflow/auto-layout";
import { isValidConnection } from "@/lib/workflow/edge-validation";
import { createNodeFromTemplate } from "@/lib/workflow/templates";
import {
  graphToYaml,
  mergeYamlIntoGraph,
  validateYamlFile,
} from "@/lib/workflow/yaml-sync";
import type { CrewNodeData, YamlBundle } from "@/types/workflow";
import type { CanvasLayoutMode, YamlFileKey } from "@crewcc/shared-types";

interface CanvasState {
  nodes: Node<CrewNodeData>[];
  edges: Edge[];
  yaml: YamlBundle;
  activeYamlFile: YamlFileKey;
  layoutMode: CanvasLayoutMode;
  yamlSyncError: string | null;
  isSyncingFromYaml: boolean;

  onNodesChange: (changes: NodeChange<Node<CrewNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: Node<CrewNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, patch: Partial<CrewNodeData>) => void;
  addNodeFromTemplate: (template: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  setActiveYamlFile: (file: YamlFileKey) => void;
  setLayoutMode: (mode: CanvasLayoutMode) => void;
  syncYamlFromGraph: (workflowName: string, workflowDescription: string) => void;
  applyYamlEdit: (
    file: YamlFileKey,
    content: string,
    workflowMeta: { name: string; description: string },
  ) => void;
  runAutoLayout: () => void;
  getSelectedNode: (nodeId: string | null) => Node<CrewNodeData> | undefined;
}

const EMPTY_YAML: YamlBundle = {
  agents: "agents: []\n",
  tasks: "tasks: []\n",
  workflow: "name: Untitled Workflow\nnodes: []\nedges: []\n",
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  yaml: EMPTY_YAML,
  activeYamlFile: "agents",
  layoutMode: "hierarchy",
  yamlSyncError: null,
  isSyncingFromYaml: false,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    if (!isValidConnection(connection, get().edges)) return;
    set({
      edges: addEdge({ ...connection, type: "animated", id: `e-${connection.source}-${connection.target}` }, get().edges),
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  updateNodeData: (nodeId, patch) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...patch } as CrewNodeData }
          : node,
      ),
    });
  },

  addNodeFromTemplate: (template, position) => {
    const node = createNodeFromTemplate(template, position);
    set({ nodes: [...get().nodes, node] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  setActiveYamlFile: (activeYamlFile) => set({ activeYamlFile }),

  setLayoutMode: (layoutMode) => set({ layoutMode }),

  syncYamlFromGraph: (workflowName, workflowDescription) => {
    if (get().isSyncingFromYaml) return;
    const { nodes, edges, layoutMode } = get();
    set({
      yaml: graphToYaml(nodes, edges, workflowName, workflowDescription, layoutMode),
      yamlSyncError: null,
    });
  },

  applyYamlEdit: (file, content, workflowMeta) => {
    const validation = validateYamlFile(file, content);
    if (!validation.ok) {
      set({ yamlSyncError: validation.error, yaml: { ...get().yaml, [file]: content } });
      return;
    }

    set({ isSyncingFromYaml: true });
    try {
      const result = mergeYamlIntoGraph(
        get().nodes,
        get().edges,
        file,
        content,
        {
          name: workflowMeta.name,
          description: workflowMeta.description,
          layoutMode: get().layoutMode,
        },
      );
      const yaml = { ...get().yaml, [file]: content };
      const fullYaml = graphToYaml(
        result.nodes,
        result.edges,
        result.meta?.name ?? workflowMeta.name,
        result.meta?.description ?? workflowMeta.description,
        result.meta?.layoutMode ?? get().layoutMode,
      );
      set({
        nodes: result.nodes,
        edges: result.edges,
        yaml: fullYaml,
        yamlSyncError: null,
        layoutMode: result.meta?.layoutMode ?? get().layoutMode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "YAML sync failed";
      set({
        yamlSyncError: message,
        yaml: { ...get().yaml, [file]: content },
      });
    } finally {
      set({ isSyncingFromYaml: false });
    }
  },

  runAutoLayout: () => {
    const laid = applyAutoLayout(get().nodes, get().edges, get().layoutMode);
    set({ nodes: laid });
  },

  getSelectedNode: (nodeId) =>
    nodeId ? get().nodes.find((n) => n.id === nodeId) : undefined,
}));
