"use client";

import { Clock, User } from "lucide-react";

import type { ApprovalSummary } from "@/services/approval-service";
import { cn } from "@/lib/utils";

interface ApprovalInboxProps {
  items: ApprovalSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ApprovalInbox({
  items,
  selectedId,
  onSelect,
}: ApprovalInboxProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        No pending approvals. Run a workflow with a Human Approval Task.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            "border-b border-border p-4 text-left transition-colors hover:bg-accent/40",
            selectedId === item.id && "bg-accent/60",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{item.task_title}</p>
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] uppercase text-orange-400">
              {item.status}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {item.agent_label}
          </p>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {item.draft_preview || "No draft preview"}
          </p>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/80">
            <Clock className="h-3 w-3" />
            {new Date(item.created_at).toLocaleString()}
          </p>
        </button>
      ))}
    </div>
  );
}
