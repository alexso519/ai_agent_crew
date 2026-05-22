"use client";

import { Workflow } from "lucide-react";

import { WorkflowCanvas } from "@/components/canvas/workflow-canvas";
import { useWorkflowStore } from "@/store/workflow-store";

export function MainCanvas() {
  const { workflow } = useWorkflowStore();

  return (
    <main className="relative flex h-full flex-col bg-canvas text-canvas-foreground">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-medium">{workflow.name}</h1>
          {workflow.isDirty && (
            <span className="text-[10px] text-muted-foreground">• unsaved</span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Workflow designer
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <WorkflowCanvas />
      </div>
    </main>
  );
}
