"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSnapshots,
  rollbackSnapshot,
  type SnapshotItem,
} from "@/services/metrics-service";
import { useAuthStore } from "@/store/auth-store";
import { useExecutionStore } from "@/store/execution-store";

interface SnapshotDialogProps {
  open: boolean;
  onClose: () => void;
  onRolledBack: () => void;
}

export function SnapshotDialog({ open, onClose, onRolledBack }: SnapshotDialogProps) {
  const token = useAuthStore((s) => s.token);
  const executionId = useExecutionStore((s) => s.executionId);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !token || !executionId) return;
    void fetchSnapshots(token, executionId).then((list) => {
      setSnapshots(list);
      setSelected(list[0]?.id ?? "");
    });
  }, [open, token, executionId]);

  if (!open) return null;

  async function handleRollback() {
    if (!token || !selected) return;
    setBusy(true);
    try {
      await rollbackSnapshot(token, selected);
      onRolledBack();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
        <h3 className="text-sm font-semibold">Rollback snapshot</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Restore execution checkpoint and re-queue the workflow.
        </p>
        <div className="mt-4 space-y-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select snapshot" />
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label} — {new Date(s.created_at).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selected || busy}
            onClick={() => void handleRollback()}
          >
            Rollback
          </Button>
        </div>
      </div>
    </div>
  );
}
