"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchExecutionMetrics,
  type ExecutionMetrics,
} from "@/services/metrics-service";
import { useAuthStore } from "@/store/auth-store";
import { useExecutionStore } from "@/store/execution-store";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  running: "#3b82f6",
  success: "#10b981",
  failed: "#ef4444",
  "waiting-human": "#f97316",
  idle: "#64748b",
};

function TokenCostChart({
  title,
  data,
}: {
  title: string;
  data: { name: string; tokens: number; cost: number }[];
}) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No token data yet.</p>;
  }
  return (
    <div className="h-48 w-full">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              fontSize: 11,
            }}
          />
          <Bar dataKey="tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GanttChart({ timeline }: { timeline: ExecutionMetrics["timeline"] }) {
  if (timeline.length === 0) {
    return <p className="text-xs text-muted-foreground">No task timeline data.</p>;
  }

  const minStart = Math.min(...timeline.map((t) => new Date(t.start).getTime()));
  const maxEnd = Math.max(...timeline.map((t) => new Date(t.end).getTime()));
  const span = Math.max(maxEnd - minStart, 1);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Execution timeline (Gantt)
      </p>
      {timeline.map((item) => {
        const left = ((new Date(item.start).getTime() - minStart) / span) * 100;
        const width = Math.max(
          ((new Date(item.end).getTime() - new Date(item.start).getTime()) / span) * 100,
          2,
        );
        return (
          <div key={item.task_id} className="flex items-center gap-2 text-[10px]">
            <span className="w-24 truncate text-muted-foreground">{item.task_label}</span>
            <div className="relative h-5 flex-1 rounded bg-muted/40">
              <div
                className="absolute top-0.5 h-4 rounded"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: STATUS_COLORS[item.status] ?? "#64748b",
                }}
                title={`${item.status} · ${item.duration_ms}ms`}
              />
            </div>
            <span className="w-16 text-right text-muted-foreground">
              {(item.duration_ms / 1000).toFixed(1)}s
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FailureHeatmap({ cells }: { cells: ExecutionMetrics["failure_heatmap"] }) {
  if (cells.length === 0) {
    return <p className="text-xs text-muted-foreground">No execution history for heatmap.</p>;
  }

  const maxFailures = Math.max(...cells.map((c) => c.failures), 1);

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Failure heatmap (by hour)
      </p>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-12">
        {cells.map((cell) => {
          const intensity = cell.failures / maxFailures;
          return (
            <div
              key={cell.hour}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded border border-border/50 p-1 text-[8px]",
              )}
              style={{
                backgroundColor: `rgba(239, 68, 68, ${0.15 + intensity * 0.85})`,
              }}
              title={`${cell.hour}: ${cell.failures} failures / ${cell.executions} runs`}
            >
              <span className="font-mono text-muted-foreground">
                {cell.hour.split(" ")[1]?.slice(0, 5) ?? ""}
              </span>
              <span className="font-semibold text-red-300">{cell.failures}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MetricsPanel() {
  const token = useAuthStore((s) => s.token);
  const executionId = useExecutionStore((s) => s.executionId);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !executionId) {
      setMetrics(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchExecutionMetrics(token, executionId);
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [token, executionId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 8000);
    return () => clearInterval(interval);
  }, [load]);

  if (!executionId) {
    return (
      <p className="p-4 text-xs text-muted-foreground">
        Run a workflow to view token costs, Gantt timeline, and failure heatmap.
      </p>
    );
  }

  if (loading && !metrics) {
    return <p className="p-4 text-xs text-muted-foreground">Loading metrics…</p>;
  }

  if (!metrics) {
    return <p className="p-4 text-xs text-muted-foreground">Metrics unavailable.</p>;
  }

  const agentChart = metrics.tokens_by_agent.map((a) => ({
    name: a.label.slice(0, 12),
    tokens: a.tokens,
    cost: a.estimated_cost_usd,
  }));
  const taskChart = metrics.tokens_by_task.map((t) => ({
    name: t.label.slice(0, 12),
    tokens: t.tokens,
    cost: t.estimated_cost_usd,
  }));

  return (
    <div className="flex h-full flex-col overflow-auto p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold">{metrics.workflow_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {metrics.workflow_total_tokens.toLocaleString()} tokens · $
            {metrics.workflow_estimated_cost_usd.toFixed(4)} est. · {metrics.error_count}{" "}
            errors · {metrics.snapshot_count} snapshots
          </p>
        </div>
        <button
          type="button"
          className="text-[10px] text-primary hover:underline"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      <Tabs defaultValue="tokens" className="flex-1">
        <TabsList className="h-8">
          <TabsTrigger value="tokens" className="text-xs">
            Token cost
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="text-xs">
            Failures
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tokens" className="mt-3 space-y-4">
          <TokenCostChart title="Per agent" data={agentChart} />
          <TokenCostChart title="Per task" data={taskChart} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-3">
          <GanttChart timeline={metrics.timeline} />
        </TabsContent>
        <TabsContent value="heatmap" className="mt-3">
          <FailureHeatmap cells={metrics.failure_heatmap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
