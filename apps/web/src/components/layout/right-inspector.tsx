"use client";

import { Settings2 } from "lucide-react";

import { AgentInspector } from "@/components/inspector/agent-inspector";
import { TaskInspector } from "@/components/inspector/task-inspector";
import { ToolInspector } from "@/components/inspector/tool-inspector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasStore } from "@/store/canvas-store";
import { useWorkflowStore } from "@/store/workflow-store";
import type { AgentNodeData, TaskNodeData, ToolNodeData } from "@/types/workflow";

export function RightInspector() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const node = useCanvasStore((s) => s.getSelectedNode(selectedNodeId));

  return (
    <aside className="flex h-full flex-col border-l border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Inspector
        </p>
      </div>
      <ScrollArea className="flex-1">
        {!node ? (
          <p className="p-4 text-sm text-muted-foreground">
            Select a node on the canvas to configure agent, task, or tool properties.
          </p>
        ) : node.data.nodeType === "agent" ? (
          <AgentInspector nodeId={node.id} data={node.data as AgentNodeData} />
        ) : node.data.nodeType === "task" ? (
          <TaskInspector nodeId={node.id} data={node.data as TaskNodeData} />
        ) : (
          <ToolInspector nodeId={node.id} data={node.data as ToolNodeData} />
        )}
      </ScrollArea>
    </aside>
  );
}
