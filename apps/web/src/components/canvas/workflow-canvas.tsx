"use client";

import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import type { DragEvent } from "react";

import { AnimatedEdge } from "@/components/canvas/edges/animated-edge";
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar";
import { AgentNode } from "@/components/canvas/nodes/agent-node";
import { TaskNode } from "@/components/canvas/nodes/task-node";
import { ToolNode } from "@/components/canvas/nodes/tool-node";
import { useCanvasStore } from "@/store/canvas-store";
import { useWorkflowStore } from "@/store/workflow-store";

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  task: TaskNode,
  tool: ToolNode,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

function WorkflowCanvasInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { workflow, setSelectedNodeId, markDirty } = useWorkflowStore();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNodeFromTemplate,
    syncYamlFromGraph,
  } = useCanvasStore();

  useEffect(() => {
    syncYamlFromGraph(workflow.name, workflow.description);
  }, [nodes, edges, workflow.name, workflow.description, syncYamlFromGraph]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const template = event.dataTransfer.getData("application/crewcc-template");
      if (!template || !wrapperRef.current) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      addNodeFromTemplate(template, position);
      markDirty();
    },
    [addNodeFromTemplate, markDirty, screenToFlowPosition],
  );

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          if (changes.some((c) => c.type !== "select")) markDirty();
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          if (changes.length > 0) markDirty();
        }}
        onConnect={(connection) => {
          onConnect(connection);
          markDirty();
        }}
        onSelectionChange={({ nodes: selected }) => {
          setSelectedNodeId(selected[0]?.id ?? null);
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="!bg-card/80 !border-border"
        />
      </ReactFlow>
      <CanvasToolbar />
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
