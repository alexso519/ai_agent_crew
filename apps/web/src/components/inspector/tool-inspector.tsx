"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCanvasStore } from "@/store/canvas-store";
import { useWorkflowStore } from "@/store/workflow-store";
import type { ToolNodeData } from "@/types/workflow";

interface ToolInspectorProps {
  nodeId: string;
  data: ToolNodeData;
}

export function ToolInspector({ nodeId, data }: ToolInspectorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const markDirty = useWorkflowStore((s) => s.markDirty);

  function patch(partial: Partial<ToolNodeData>) {
    updateNodeData(nodeId, partial);
    markDirty();
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="tool-label">Display name</Label>
        <Input
          id="tool-label"
          value={data.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tool-id">Tool identifier</Label>
        <Input
          id="tool-id"
          value={data.toolName}
          onChange={(e) => patch({ toolName: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="perms">Permissions (comma-separated)</Label>
        <Input
          id="perms"
          value={data.permissions.join(", ")}
          onChange={(e) =>
            patch({
              permissions: e.target.value
                .split(",")
                .map((p) => p.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full gap-2"
        onClick={() => {
          removeNode(nodeId);
          markDirty();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove node
      </Button>
    </div>
  );
}
