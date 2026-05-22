from collections import defaultdict
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from db.models.execution import Execution
from db.models.log import LogEntry
from models.enums import ExecutionStatus
from services.snapshot_service import SnapshotService
from schemas.metrics import (
    ExecutionMetricsResponse,
    HeatmapCell,
    TimelineItem,
    TokenSeriesItem,
)

# Rough pricing table (USD per 1K tokens) for dashboard estimates
COST_PER_1K_TOKENS = 0.002


class MetricsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_execution_metrics(self, execution_id: UUID) -> ExecutionMetricsResponse:
        execution = (
            self.db.query(Execution)
            .options(joinedload(Execution.workflow))
            .filter(Execution.id == execution_id)
            .first()
        )
        if execution is None:
            raise ValueError("Execution not found")

        logs = list(
            self.db.scalars(
                select(LogEntry)
                .where(LogEntry.execution_id == execution_id)
                .order_by(LogEntry.created_at.asc()),
            ).all(),
        )

        ckpt = execution.checkpoint or {}
        usage = ckpt.get("token_usage") or {
            "agents": {},
            "tasks": {},
            "workflow_total": 0,
        }
        graph = ckpt.get("graph_definition") or execution.workflow.graph_definition or {}
        node_labels = {
            str(n.get("id", "")): str((n.get("data") or {}).get("label", n.get("id", "")))
            for n in graph.get("nodes", [])
        }

        tokens_by_agent = [
            TokenSeriesItem(
                id=aid,
                label=node_labels.get(aid, aid[:12]),
                tokens=int(count),
                estimated_cost_usd=round(int(count) / 1000 * COST_PER_1K_TOKENS, 4),
            )
            for aid, count in (usage.get("agents") or {}).items()
        ]
        tokens_by_task = [
            TokenSeriesItem(
                id=tid,
                label=node_labels.get(tid, tid[:12]),
                tokens=int(count),
                estimated_cost_usd=round(int(count) / 1000 * COST_PER_1K_TOKENS, 4),
            )
            for tid, count in (usage.get("tasks") or {}).items()
        ]

        workflow_total = int(usage.get("workflow_total") or 0)
        timeline = self._build_timeline(logs, node_labels)
        heatmap = self._build_failure_heatmap(execution.workflow_id)
        error_count = sum(1 for log in logs if log.tag == "Error")
        snap_count = len(SnapshotService(self.db).list_for_execution(execution_id))

        return ExecutionMetricsResponse(
            execution_id=str(execution.id),
            workflow_id=str(execution.workflow_id),
            workflow_name=execution.workflow.name,
            status=execution.status.value,
            token_usage=usage,
            tokens_by_agent=tokens_by_agent,
            tokens_by_task=tokens_by_task,
            workflow_total_tokens=workflow_total,
            workflow_estimated_cost_usd=round(
                workflow_total / 1000 * COST_PER_1K_TOKENS,
                4,
            ),
            timeline=timeline,
            failure_heatmap=heatmap,
            error_count=error_count,
            snapshot_count=snap_count,
        )

    def _build_timeline(
        self,
        logs: list[LogEntry],
        node_labels: dict[str, str],
    ) -> list[TimelineItem]:
        task_windows: dict[str, dict] = {}

        for entry in logs:
            payload = entry.payload or {}
            task_id = payload.get("task_id")
            if not task_id:
                continue
            ts = entry.created_at
            window = task_windows.setdefault(
                str(task_id),
                {
                    "start": ts,
                    "end": ts,
                    "agent_id": payload.get("agent_id"),
                    "status": "running",
                },
            )
            window["end"] = ts
            if entry.tag == "Error":
                window["status"] = "failed"
            elif entry.tag == "Observation":
                window["status"] = "success"
            elif payload.get("requires_approval"):
                window["status"] = "waiting-human"

        items: list[TimelineItem] = []
        for task_id, window in task_windows.items():
            start = window["start"]
            end = window["end"]
            duration_ms = int((end - start).total_seconds() * 1000)
            items.append(
                TimelineItem(
                    task_id=task_id,
                    task_label=node_labels.get(task_id, task_id),
                    agent_id=window.get("agent_id"),
                    start=start.isoformat(),
                    end=end.isoformat(),
                    status=window["status"],
                    duration_ms=max(duration_ms, 1),
                ),
            )
        return sorted(items, key=lambda x: x.start)

    def _build_failure_heatmap(self, workflow_id: UUID) -> list[HeatmapCell]:
        executions = list(
            self.db.scalars(
                select(Execution).where(Execution.workflow_id == workflow_id).limit(200),
            ).all(),
        )
        buckets: dict[str, dict[str, int]] = defaultdict(
            lambda: {"failures": 0, "executions": 0},
        )

        for ex in executions:
            hour_key = (
                ex.created_at.astimezone(UTC).strftime("%Y-%m-%d %H:00")
                if ex.created_at
                else "unknown"
            )
            buckets[hour_key]["executions"] += 1
            if ex.status == ExecutionStatus.FAILED:
                buckets[hour_key]["failures"] += 1
            else:
                err_count = self.db.scalar(
                    select(func.count())
                    .select_from(LogEntry)
                    .where(
                        LogEntry.execution_id == ex.id,
                        LogEntry.tag == "Error",
                    ),
                )
                if err_count and int(err_count) > 0:
                    buckets[hour_key]["failures"] += 1

        return [
            HeatmapCell(hour=hour, failures=data["failures"], executions=data["executions"])
            for hour, data in sorted(buckets.items())
        ][-24:]
