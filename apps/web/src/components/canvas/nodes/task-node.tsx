"use client";

import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { STATUS_LABEL, STATUS_RING } from "@/components/canvas/nodes/status-styles";
import { cn } from "@/lib/utils";
import type { TaskNodeData } from "@/types/workflow";

function TaskNodeComponent({ data, selected }: NodeProps) {
  const d = data as TaskNodeData;

  return (
    <motion.div
      layout
      className={cn(
        "min-w-[200px] rounded-lg border border-border bg-card px-3 py-2 ring-2",
        STATUS_RING[d.status],
        selected && "border-primary",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{d.title}</p>
          <p className="text-[10px] text-muted-foreground">{d.label}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${Math.min(100, d.progress)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {STATUS_LABEL[d.status]} · P{d.priority}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </motion.div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
