"use client";

import { motion } from "framer-motion";
import { Bot, Brain } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { STATUS_LABEL, STATUS_RING } from "@/components/canvas/nodes/status-styles";
import { cn } from "@/lib/utils";
import type { AgentNodeData } from "@/types/workflow";

function AgentNodeComponent({ data, selected }: NodeProps) {
  const d = data as AgentNodeData;
  const memoryOn = d.memoryShortTerm || d.memoryLongTerm || d.memoryEntity;

  return (
    <motion.div
      layout
      className={cn(
        "min-w-[200px] rounded-lg border border-border bg-card px-3 py-2 ring-2",
        STATUS_RING[d.status],
        selected && "border-primary",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{d.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">{d.role}</p>
          <p className="text-[10px] text-muted-foreground">
            {d.llmProvider}/{d.llmModel}
          </p>
        </div>
        {memoryOn && (
          <Brain className="h-3 w-3 shrink-0 text-violet-400" aria-label="Memory enabled" />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{STATUS_LABEL[d.status]}</span>
        <span>{d.tokenCount.toLocaleString()} tok</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </motion.div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
