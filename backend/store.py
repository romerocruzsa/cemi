"""In-memory store for projects and runs. Replaced by DB in backend-persistence."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class RunRecord:
    id: str
    project_id: str
    name: str
    status: str
    created_at: str
    started_at: str
    ended_at: str | None
    updated_at: str
    notes: str | None
    tags: dict[str, str]
    params: list[dict[str, Any]]
    metrics: list[dict[str, Any]]
    summary_metrics: dict[str, Any]
    artifacts: list[dict[str, Any]]
    action_events: list[dict[str, Any]]
    method: str | None
    quantization: str | None
    target_profile: dict[str, Any] | None
    context: dict[str, Any]
    owner: dict[str, Any] | None
    baseline_run_id: str | None
    parent_run_id: str | None

    def to_api(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "updated_at": self.updated_at,
            "notes": self.notes,
            "tags": self.tags,
            "params": self.params,
            "parameters": self.params,
            "metrics": self.metrics,
            "summary_metrics": self.summary_metrics,
            "artifacts": self.artifacts,
            "action_events": self.action_events,
            "method": self.method,
            "quantization": self.quantization,
            "target_profile": self.target_profile,
            "context": self.context,
            "owner": self.owner,
            "baseline_run_id": self.baseline_run_id,
            "parent_run_id": self.parent_run_id,
        }


class Store:
    def __init__(self) -> None:
        self.projects: dict[str, dict[str, Any]] = {}
        self.runs: dict[str, RunRecord] = {}
        self._run_tokens: dict[str, str] = {}  # run_id -> token

    def ensure_default_project(self) -> str:
        if "default" not in self.projects:
            self.projects["default"] = {
                "id": "default",
                "name": "Default Project",
                "org_id": "default",
                "created_at": _now_iso(),
            }
        return "default"

    def create_run(
        self,
        project_id: str,
        name: str | None = None,
        run_token: str | None = None,
    ) -> tuple[RunRecord, str]:
        run_id = str(uuid.uuid4())
        now = _now_iso()
        run = RunRecord(
            id=run_id,
            project_id=project_id,
            name=name or f"Run {run_id[:8]}",
            status="running",
            created_at=now,
            started_at=now,
            ended_at=None,
            updated_at=now,
            notes=None,
            tags={},
            params=[],
            metrics=[],
            summary_metrics={},
            artifacts=[],
            action_events=[],
            method=None,
            quantization=None,
            target_profile=None,
            context={},
            owner=None,
            baseline_run_id=None,
            parent_run_id=None,
        )
        self.runs[run_id] = run
        token = run_token or str(uuid.uuid4())
        self._run_tokens[run_id] = token
        return run, token

    def get_run(self, run_id: str) -> RunRecord | None:
        return self.runs.get(run_id)

    def list_runs(self, project_id: str) -> list[RunRecord]:
        return [r for r in self.runs.values() if r.project_id == project_id]

    def update_run(self, run_id: str, payload: dict[str, Any]) -> RunRecord | None:
        run = self.runs.get(run_id)
        if not run:
            return None
        now = _now_iso()
        if "name" in payload:
            run.name = payload["name"]
        if "status" in payload:
            run.status = payload["status"]
        if "notes" in payload:
            run.notes = payload["notes"]
        if "ended_at" in payload:
            run.ended_at = payload["ended_at"]
        run.updated_at = now
        return run

    def apply_run_record_payload(self, run_id: str, payload: dict[str, Any]) -> RunRecord | None:
        run = self.runs.get(run_id)
        if not run:
            return None
        run.updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        run.name = payload.get("name", run.name)
        run.status = payload.get("status", run.status)
        run.notes = payload.get("notes", run.notes)
        run.ended_at = payload.get("ended_at", run.ended_at)
        if "parameters" in payload:
            run.params = list(payload["parameters"])
        if "metrics" in payload:
            metrics_payload = payload["metrics"]
            if isinstance(metrics_payload, list):
                run.metrics.extend(metrics_payload)
            elif isinstance(metrics_payload, dict):
                events = metrics_payload.get("events")
                if isinstance(events, list):
                    run.metrics = list(events)
                summary = metrics_payload.get("summary")
                if isinstance(summary, list):
                    for metric in summary:
                        if not isinstance(metric, dict):
                            continue
                        name = metric.get("name")
                        value = metric.get("value")
                        if isinstance(name, str):
                            run.summary_metrics[name] = value
        if "summary_metrics" in payload:
            run.summary_metrics.update(payload["summary_metrics"])
        if "artifacts" in payload:
            run.artifacts = list(payload["artifacts"])
        if "action_events" in payload:
            run.action_events = list(payload["action_events"])
        if "method" in payload:
            run.method = payload.get("method")
        if "quantization" in payload:
            run.quantization = payload.get("quantization")
        if "target_profile" in payload:
            run.target_profile = payload.get("target_profile")
        if "context" in payload and isinstance(payload["context"], dict):
            run.context = dict(payload["context"])
        if "owner" in payload:
            run.owner = payload.get("owner")
        if "baseline_run_id" in payload:
            run.baseline_run_id = payload.get("baseline_run_id")
        if "parent_run_id" in payload:
            run.parent_run_id = payload.get("parent_run_id")
        return run

    def validate_run_token(self, run_id: str, token: str) -> bool:
        return self._run_tokens.get(run_id) == token


store = Store()
