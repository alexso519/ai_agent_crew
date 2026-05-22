"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, LayoutDashboard } from "lucide-react";

import { ApprovalDetailView } from "@/components/hitl/approval-detail";
import { ApprovalInbox } from "@/components/hitl/approval-inbox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  approveApproval,
  fetchApproval,
  fetchApprovals,
  regenerateApproval,
  rejectApproval,
  resumeFromApproval,
  type ApprovalDetail,
  type ApprovalSummary,
} from "@/services/approval-service";

export default function ApprovalsPage() {
  const { token, can, user } = useAuth();
  const [items, setItems] = useState<ApprovalSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadInbox = useCallback(async () => {
    if (!token) return;
    const list = await fetchApprovals(token);
    setItems(list);
    setSelectedId((current) => current ?? list[0]?.id ?? null);
  }, [token]);

  useEffect(() => {
    void loadInbox();
    const interval = setInterval(() => void loadInbox(), 10000);
    return () => clearInterval(interval);
  }, [loadInbox]);

  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    void fetchApproval(token, selectedId)
      .then(setDetail)
      .finally(() => setLoadingDetail(false));
  }, [token, selectedId]);

  if (!can("approve")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8">
        <p className="text-sm text-muted-foreground">
          Reviewer role or higher required for the approval inbox.
        </p>
        <Button asChild variant="outline">
          <Link href="/control">Back to control center</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-10 items-center gap-3 border-b border-border px-4">
        <Inbox className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-semibold">Human-in-the-loop inbox</h1>
        <span className="text-xs text-muted-foreground">
          {items.length} pending · {user?.email}
        </span>
        <Button asChild variant="ghost" size="sm" className="ml-auto gap-1">
          <Link href="/control">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Control center
          </Link>
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr]">
        <aside className="border-r border-border bg-card/30">
          <ApprovalInbox
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>
        <main className="min-w-0 bg-background">
          <ApprovalDetailView
            detail={detail}
            isLoading={loadingDetail}
            onApprove={async (humanEdit, instructions) => {
              if (!token || !selectedId) return;
              await approveApproval(token, selectedId, { human_edit: humanEdit, instructions });
              await loadInbox();
              setSelectedId(null);
              setDetail(null);
            }}
            onReject={async (reason) => {
              if (!token || !selectedId) return;
              await rejectApproval(token, selectedId, reason);
              await loadInbox();
              setSelectedId(null);
              setDetail(null);
            }}
            onRegenerate={async () => {
              if (!token || !selectedId) return;
              const updated = await regenerateApproval(token, selectedId);
              setDetail(updated);
            }}
            onResume={async (humanEdit, instructions) => {
              if (!token || !selectedId) return;
              await resumeFromApproval(token, selectedId, {
                human_edit: humanEdit,
                instructions,
              });
              await loadInbox();
              setSelectedId(null);
              setDetail(null);
            }}
          />
        </main>
      </div>
    </div>
  );
}
