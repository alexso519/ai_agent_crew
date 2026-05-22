"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCanvasStore } from "@/store/canvas-store";
import { useWorkflowStore } from "@/store/workflow-store";
import type { TaskNodeData } from "@/types/workflow";

interface TaskInspectorProps {
  nodeId: string;
  data: TaskNodeData;
}

export function TaskInspector({ nodeId, data }: TaskInspectorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const markDirty = useWorkflowStore((s) => s.markDirty);

  function patch(partial: Partial<TaskNodeData>) {
    updateNodeData(nodeId, partial);
    markDirty();
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => patch({ title: e.target.value, label: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          value={data.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expected">Expected output</Label>
        <Textarea
          id="expected"
          value={data.expectedOutput}
          onChange={(e) => patch({ expectedOutput: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="timeout">Timeout (s)</Label>
          <Input
            id="timeout"
            type="number"
            value={data.timeoutSeconds}
            onChange={(e) => patch({ timeoutSeconds: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="retries">Retries</Label>
          <Input
            id="retries"
            type="number"
            value={data.maxRetries}
            onChange={(e) => patch({ maxRetries: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={data.priority}
            onChange={(e) => patch({ priority: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="approval">Requires approval</Label>
        <Switch
          id="approval"
          checked={data.requiresApproval}
          onCheckedChange={(v) =>
            patch({
              requiresApproval: v,
              status: v ? "waiting-human" : "idle",
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
