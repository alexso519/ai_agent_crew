"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApprovalDetail } from "@/services/approval-service";

interface ApprovalDetailViewProps {
  detail: ApprovalDetail | null;
  isLoading: boolean;
  onApprove: (humanEdit: string, instructions: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onResume: (humanEdit: string, instructions: string) => Promise<void>;
}

export function ApprovalDetailView({
  detail,
  isLoading,
  onApprove,
  onReject,
  onRegenerate,
  onResume,
}: ApprovalDetailViewProps) {
  const [humanEdit, setHumanEdit] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (detail?.ai_draft) {
      setHumanEdit(detail.ai_draft);
    }
  }, [detail?.id, detail?.ai_draft]);

  if (isLoading || !detail) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const draft = humanEdit || detail.ai_draft || "";

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{detail.task_title}</h2>
        <p className="text-xs text-muted-foreground">
          {detail.workflow_name} · agent {detail.agent_label}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-0">
        <div className="flex flex-col border-r border-border">
          <p className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI draft
          </p>
          <pre className="flex-1 overflow-auto p-3 font-mono text-xs text-foreground/90 whitespace-pre-wrap">
            {detail.ai_draft || "—"}
          </pre>
        </div>
        <div className="flex flex-col">
          <p className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Human edit
          </p>
          <Textarea
            className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0"
            value={humanEdit || detail.ai_draft || ""}
            onChange={(e) => setHumanEdit(e.target.value)}
            placeholder="Edit the AI draft before approving…"
          />
        </div>
      </div>
      <div className="space-y-3 border-t border-border p-4">
        <div className="space-y-1">
          <Label htmlFor="instructions" className="text-xs">
            Instructions for crew (optional)
          </Label>
          <Textarea
            id="instructions"
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Additional guidance when resuming the workflow…"
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reject" className="text-xs">
            Rejection reason
          </Label>
          <InputReject
            value={rejectReason}
            onChange={setRejectReason}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              act(() => onApprove(draft, instructions))
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              act(() => onResume(draft, instructions))
            }
          >
            Resume workflow
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="gap-1"
            onClick={() => act(onRegenerate)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy || !rejectReason.trim()}
            onClick={() => act(() => onReject(rejectReason))}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

function InputReject({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      className="flex min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Required to reject…"
    />
  );
}
