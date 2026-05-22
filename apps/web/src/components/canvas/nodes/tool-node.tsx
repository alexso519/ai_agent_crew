"use client";

import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { STATUS_RING } from "@/components/canvas/nodes/status-styles";
import { cn } from "@/lib/utils";
import type { ToolNodeData } from "@/types/workflow";

function ToolNodeComponent({ data, selected }: NodeProps) {
  const d = data as ToolNodeData;

  return (
    <motion.div
      layout
      className={cn(
        "min-w-[180px] rounded-lg border border-border bg-card px-3 py-2 ring-2",
        STATUS_RING[d.status],
        selected && "border-primary",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-emerald-500" />
        <div>
          <p className="text-xs font-semibold">{d.label}</p>
          <p className="text-[10px] text-muted-foreground">{d.toolName}</p>
        </div>
      </div>
      {d.permissions.length > 0 && (
        <p className="mt-1 truncate text-[10px] text-muted-foreground">
          {d.permissions.join(", ")}
        </p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </motion.div>
  );
}

export const ToolNode = memo(ToolNodeComponent);
