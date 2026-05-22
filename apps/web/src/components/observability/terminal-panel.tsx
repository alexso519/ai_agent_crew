"use client";

import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchExecutionLogs } from "@/services/observability-service";
import { useAuthStore } from "@/store/auth-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useExecutionStore } from "@/store/execution-store";
import { ALL_TAGS, useObservabilityStore } from "@/store/observability-store";
import type { ExecutionLogLine, LogTag } from "@/types/execution";
import { cn } from "@/lib/utils";

const TAG_CLASS: Record<LogTag, string> = {
  Planning: "text-blue-400",
  Thought: "text-violet-400",
  Action: "text-amber-400",
  Observation: "text-emerald-400",
  Tool: "text-cyan-400",
  Error: "text-red-400",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function LogLine({ line }: { line: ExecutionLogLine }) {
  return (
    <div className="group flex gap-2 font-mono text-[11px] leading-relaxed">
      <span className="shrink-0 text-muted-foreground/60">{formatTime(line.timestamp)}</span>
      <span className={cn("shrink-0 font-semibold", TAG_CLASS[line.tag])}>
        [{line.tag}]
      </span>
      {line.agentId && (
        <span className="shrink-0 text-muted-foreground">@{line.agentId.slice(0, 10)}</span>
      )}
      {line.taskId && (
        <span className="shrink-0 text-muted-foreground/80">task:{line.taskId.slice(0, 8)}</span>
      )}
      <span className="text-foreground/90">{line.message}</span>
    </div>
  );
}

export function TerminalPanel() {
  const token = useAuthStore((s) => s.token);
  const executionId = useExecutionStore((s) => s.executionId);
  const logs = useExecutionStore((s) => s.logs);
  const setLogs = useExecutionStore((s) => s.setLogs);
  const streamConnected = useExecutionStore((s) => s.streamConnected);
  const nodes = useCanvasStore((s) => s.nodes);

  const {
    enabledTags,
    searchQuery,
    agentFilter,
    taskFilter,
    pauseScroll,
    toggleTag,
    setSearchQuery,
    setAgentFilter,
    setTaskFilter,
    setPauseScroll,
    resetFilters,
  } = useObservabilityStore();

  const bottomRef = useRef<HTMLDivElement>(null);

  const agentOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.data.nodeType === "agent")
        .map((n) => ({ id: n.id, label: n.data.label })),
    [nodes],
  );

  const filtered = logs.filter((line) => {
    if (!enabledTags.has(line.tag)) return false;
    if (searchQuery && !line.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (agentFilter && agentFilter !== "all" && line.agentId !== agentFilter) {
      return false;
    }
    if (taskFilter && line.taskId && !line.taskId.includes(taskFilter)) {
      return false;
    }
    if (taskFilter && !line.taskId) return false;
    return true;
  });

  useEffect(() => {
    if (!pauseScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered.length, pauseScroll]);

  useEffect(() => {
    if (!token || !executionId) return;
    void fetchExecutionLogs(token, executionId).then((historical) => {
      setLogs(historical);
    });
  }, [token, executionId, setLogs]);

  async function exportLogs() {
    if (!token || !executionId) return;
    const base =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (agentFilter && agentFilter !== "all") params.set("agent_id", agentFilter);
    const qs = params.toString();
    const response = await fetch(
      `${base}/workflow/logs/${executionId}/export${qs ? `?${qs}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const text = await response.text();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crewcc-${executionId.slice(0, 8)}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-[#161b22] px-2 py-1.5">
        <div className="flex flex-wrap gap-1">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                enabledTags.has(tag)
                  ? TAG_CLASS[tag]
                  : "text-muted-foreground/50 line-through",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 w-36 border-border/60 bg-[#0d1117] text-xs"
        />
        <Select value={agentFilter || "all"} onValueChange={setAgentFilter}>
          <SelectTrigger className="h-7 w-36 border-border/60 bg-[#0d1117] text-xs">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agentOptions.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Task ID filter"
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
          className="h-7 w-28 border-border/60 bg-[#0d1117] text-xs"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px]"
          onClick={() => setPauseScroll(!pauseScroll)}
        >
          {pauseScroll ? "Resume scroll" : "Pause scroll"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={resetFilters}>
          Reset
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => void exportLogs()}>
          Export
        </Button>
        <span
          className={cn(
            "ml-auto text-[10px]",
            streamConnected ? "text-emerald-400" : "text-muted-foreground",
          )}
        >
          {streamConnected ? "● SSE live" : "○ SSE idle"} · {filtered.length} lines
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Run a workflow to stream [Planning] [Thought] [Action] [Observation] [Tool] [Error] events.
          </p>
        ) : (
          filtered.map((line) => <LogLine key={line.id} line={line} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
