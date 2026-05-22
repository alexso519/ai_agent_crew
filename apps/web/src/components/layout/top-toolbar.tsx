"use client";

import { useState } from "react";
import Link from "next/link";
import {
  History,
  Inbox,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
  Square,
  User,
} from "lucide-react";

import { SnapshotDialog } from "@/components/execution/snapshot-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePendingApprovals } from "@/hooks/use-pending-approvals";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";

export function TopToolbar() {
  const { user, signOut, can } = useAuth();
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const {
    status,
    run,
    pause,
    resume,
    kill,
    replay,
    retry,
    refreshStatus,
    canRun,
    canPause,
    canResume,
    canKill,
    canReplay,
    canRetry,
  } = useWorkflowExecution();
  const { count: pendingApprovals } = usePendingApprovals();

  return (
    <>
      <header className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-card/60 px-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute") || !canRun}
          onClick={() => void run()}
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute") || !canPause}
          onClick={() => void pause()}
        >
          <Pause className="h-3.5 w-3.5" />
          Pause
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute") || !canResume}
          onClick={() => void resume()}
        >
          <Play className="h-3.5 w-3.5" />
          Resume
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute") || !canKill}
          onClick={() => void kill()}
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute") || !canRetry}
          onClick={() => void retry()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute") || !canReplay}
          onClick={() => void replay()}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!can("execute")}
          onClick={() => setSnapshotOpen(true)}
        >
          <History className="h-3.5 w-3.5" />
          Snapshot
        </Button>
        <span className="mx-2 rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {status}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {can("approve") && (
            <Button asChild variant="ghost" size="sm" className="relative gap-1">
              <Link href="/approvals">
                <Inbox className="h-3.5 w-3.5" />
                Inbox
                {pendingApprovals > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                    {pendingApprovals}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {user && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {user.email}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                {user.role}
              </span>
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <SnapshotDialog
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        onRolledBack={() => void refreshStatus()}
      />
    </>
  );
}
