from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Union
import uuid
import shutil
import mimetypes

from .defaults import DEFAULT_SAVE_DIR, default_gateway_base_url

_logger = logging.getLogger(__name__)


JSONScalar = Union[str, int, float, bool, None]
JSONValue = Union[JSONScalar, Dict[str, Any], List[Any]]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def _iso_from_timestamp_ms(timestamp_ms: int) -> str:
    dt = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")

def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _infer_value_type(value: JSONValue) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    # dict/list/etc.
    return "json"


def _compact_json(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    try:
        return json.dumps(value, ensure_ascii=True, sort_keys=True)
    except Exception:
        return str(value)


# ---------------------------------------------------------------------------
# Sink protocol and implementations
# ---------------------------------------------------------------------------


class SinkProtocol(Protocol):
    """Protocol for Writer destinations."""

    def write(self, record: dict[str, Any]) -> None:
        ...


class StdoutSink:
    """Destination: terminal (stdout)."""

    def write(self, record: dict[str, Any]) -> None:
        print(json.dumps(record, ensure_ascii=True, indent=2), flush=True)


class LocalFileSink:
    """Destination: local files (e.g. .cemi/runs/). Appends run_record events as JSONL."""

    def __init__(
        self,
        base_dir: str | Path | None = None,
        *,
        run_id: str | None = None,
    ) -> None:
        resolved = base_dir or f"{DEFAULT_SAVE_DIR}/runs"
        self.base_dir = Path(resolved).expanduser()
        self.run_id = run_id or ""

    def _get_file_path(self, record: dict[str, Any]) -> Path:
        payload = record.get("payload") or {}
        rid = payload.get("run_id") or payload.get("id") or self.run_id or str(uuid.uuid4())
        self.base_dir.mkdir(parents=True, exist_ok=True)
        return self.base_dir / f"{rid}.jsonl"

    def write(self, record: dict[str, Any]) -> None:
        path = self._get_file_path(record)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=True) + "\n")


def create_writer(
    project: str | None = None,
    log_dir: str | Path | None = None,
    *,
    context: dict[str, Any] | None = None,
) -> "Writer":
    """
    Create a Writer that logs to local disk.

    This is the primary way to choose where run data is stored. Use the same
    path for the local gateway (e.g. `cemi gateway --save-dir <log_dir>`) so
    the workspace UI can read your runs.

    Args:
        project: Project name (default: 'default').
        log_dir: Base directory for runs and artifacts. Runs are written to
            log_dir/runs/<run_id>.jsonl and artifacts to log_dir/artifacts/<run_id>/.
            Default is '.cemi'.

    Returns:
        Writer instance configured to write to log_dir/runs/ (and use
        log_dir for artifact paths).
    """
    resolved_dir = Path(log_dir or DEFAULT_SAVE_DIR).expanduser()
    runs_dir = resolved_dir / "runs"
    sink = LocalFileSink(base_dir=runs_dir)
    return Writer(sink=sink, project=project, context=dict(context or {}), save_dir=resolved_dir)


def create_writer_from_env(
    project: str | None = None,
    stage: str | None = None,
    *,
    run_id: str | None = None,
    run_token: str | None = None,
    api_base: str | None = None,
    project_id: str | None = None,
    context: dict[str, Any] | None = None,
    force_local: bool = False,
    save_dir: str | Path | None = None,
    **context_kwargs: Any,
) -> "Writer":
    """Create a local writer using CEMI environment defaults when available.

    Use this when running under `cemi start`, which sets CEMI_RUN_ID and
    CEMI_SAVE_DIR for the local closed-beta flow. For local-only scripts,
    prefer `create_writer(project, log_dir)`.

    `save_dir` is mapped to `log_dir` using the same on-disk layout
    (`save_dir/runs`, `save_dir/artifacts`). Extra keyword arguments are folded
    into the initial writer context for backward compatibility.
    """
    resolved_project = project or project_id or os.environ.get("CEMI_PROJECT_ID") or os.environ.get("CEMI_PROJECT")
    log_dir = save_dir or os.environ.get("CEMI_SAVE_DIR") or DEFAULT_SAVE_DIR
    resolved_context = dict(context or {})
    resolved_context.update(context_kwargs)
    return create_writer(project=resolved_project, log_dir=log_dir, context=resolved_context)


class _WriterContextNamespace:
    """Base helper for namespaced notebook context setters."""

    def __init__(self, writer: "Writer", section_name: str) -> None:
        self._writer = writer
        self._section_name = section_name

    def _set_values(self, values: dict[str, JSONValue]) -> dict[str, JSONValue]:
        return self._writer._set_context_section(self._section_name, values)


class WriterCaseNamespace(_WriterContextNamespace):
    """Namespace for structured case metadata shown in Compare."""

    def __init__(self, writer: "Writer") -> None:
        super().__init__(writer, "case")

    def set(
        self,
        *,
        suite: JSONValue | None = None,
        task: JSONValue | None = None,
        scenario: JSONValue | None = None,
        dataset: JSONValue | None = None,
        **extra: JSONValue,
    ) -> dict[str, JSONValue]:
        """Merge case metadata such as suite, task, scenario, and dataset."""
        values: dict[str, JSONValue] = {
            "suite": suite,
            "task": task,
            "scenario": scenario,
            "dataset": dataset,
        }
        values.update(extra)
        return self._set_values(values)


class WriterPolicyNamespace(_WriterContextNamespace):
    """Namespace for decision-policy metadata used by Compare."""

    def __init__(self, writer: "Writer") -> None:
        super().__init__(writer, "policy")

    def set(
        self,
        *,
        name: JSONValue | None = None,
        objective_metric: JSONValue | None = None,
        objective_direction: JSONValue | None = None,
        **extra: JSONValue,
    ) -> dict[str, JSONValue]:
        """Merge policy metadata such as name and optimization objective."""
        values: dict[str, JSONValue] = {
            "name": name,
            "objective_metric": objective_metric,
            "objective_direction": objective_direction,
        }
        values.update(extra)
        return self._set_values(values)


class WriterDeviceNamespace(_WriterContextNamespace):
    """Namespace for target-device metadata shown alongside runs."""

    def __init__(self, writer: "Writer") -> None:
        super().__init__(writer, "device")

    def set(
        self,
        *,
        board: JSONValue | None = None,
        runtime: JSONValue | None = None,
        memory_budget: JSONValue | None = None,
        flash_budget: JSONValue | None = None,
        ram_budget: JSONValue | None = None,
        **extra: JSONValue,
    ) -> dict[str, JSONValue]:
        """Merge target-device metadata such as board, runtime, and budgets."""
        values: dict[str, JSONValue] = {
            "board": board,
            "runtime": runtime,
            "memory_budget": memory_budget,
            "flash_budget": flash_budget,
            "ram_budget": ram_budget,
        }
        values.update(extra)
        return self._set_values(values)

@dataclass
class Writer:
    """
    Primary API for building and emitting CEMI run records.

    The writer maintains a single in-memory run snapshot and can emit it
    repeatedly as the run evolves. Each emitted snapshot includes the current
    run metadata, context namespaces, parameters, metrics, and artifacts.

    Compatibility notes:
    - Legacy schema: `run_record` schema version 1.0 uses fields like
      `payload.id`, `payload.metrics[]`, and `payload.summary_metrics{}`.
    - Current model-neutral schema: schema version 2.0 uses fields like
      `payload.run_id`, `payload.project`, `payload.stage`, `payload.context`,
      and `payload.metrics.events[]` / `payload.metrics.summary[]`.
    """
    sink: Any
    schema_version: str = "2.0"
    project: str | None = None
    stage: str | None = None
    context: Dict[str, Any] = field(default_factory=dict)
    save_dir: str | Path | None = None

    # Current run record state (payload)
    _run: Dict[str, Any] = field(default_factory=dict)
    _metrics: List[Dict[str, Any]] = field(default_factory=list)  # legacy metrics list
    _parameters: List[Dict[str, Any]] = field(default_factory=list)
    _artifacts: List[Dict[str, Any]] = field(default_factory=list)
    _summary_metrics: Dict[str, JSONScalar] = field(default_factory=dict)
    _metric_events: List[Dict[str, Any]] = field(default_factory=list)
    _metric_summary: List[Dict[str, Any]] = field(default_factory=list)
    _action_events: List[Dict[str, Any]] = field(default_factory=list)

    _run_id: str | None = None
    _project: str | None = None
    _stage: str | None = None
    _created_at_ms: int | None = None
    case: WriterCaseNamespace = field(init=False, repr=False)
    policy: WriterPolicyNamespace = field(init=False, repr=False)
    device: WriterDeviceNamespace = field(init=False, repr=False)

    _ROLE_VALUES = {"quality", "performance", "resource", "cost", "custom"}
    _AGG_VALUES = {"raw", "mean", "min", "max", "p50", "p90", "p95", "p99", "sum", "count", "last"}
    _DIR_VALUES = {"lower_is_better", "higher_is_better", "none"}
    _CONTEXT_PARAM_PREFIXES = {"case": "case", "policy": "policy", "device": "device"}

    def __post_init__(self) -> None:
        self.context = dict(self.context or {})
        self.case = WriterCaseNamespace(self)
        self.policy = WriterPolicyNamespace(self)
        self.device = WriterDeviceNamespace(self)

    # ----------------------------
    # Lifecycle / run metadata
    # ----------------------------
    def start_run(
        self,
        name: str | None = None,
        tags: Dict[str, str] | None = None,
        *,
        # plan.md v0 optional overrides
        run_id: str | None = None,
        project: str | None = None,
        stage: str | None = None,
        status: str = "running",
        created_at_ms: int | None = None,
        # legacy kwargs (still accepted)
        id: Optional[str] = None,
        project_id: str | None = None,
        created_at: Optional[str] = None,
        started_at: Optional[str] = None,
    ) -> str:
        """
        Start a new run and initialize its payload.

        This resets all accumulated metrics, parameters, and artifacts from any
        previous run on the same writer instance. The returned run id is used by
        subsequent calls and by emitted snapshots.

        Notes:
        - Legacy keywords such as `project_id` and `id` are still accepted.
        - If no run id is supplied, the writer prefers `CEMI_RUN_ID` from the
          environment before generating a UUID.

        Returns:
            The resolved run id.
        """
        # Resolve identity + core context.
        # Use explicit run_id/id kwarg, else CEMI_RUN_ID from env (e.g. set by cemi start), else generate.
        explicit = (run_id or id or "").strip()
        if explicit:
            resolved_run_id = explicit
        else:
            resolved_run_id = (os.environ.get("CEMI_RUN_ID") or "").strip() or str(uuid.uuid4())
        resolved_project = (project or self.project or project_id or "default").strip()
        resolved_stage = (stage or self.stage or "default").strip()

        resolved_name = name.strip() if isinstance(name, str) and name.strip() else "run"

        now_ms = _now_ms()
        created_ms = int(created_at_ms) if isinstance(created_at_ms, int) else now_ms

        self._run_id = resolved_run_id
        self._project = resolved_project
        self._stage = resolved_stage
        self._created_at_ms = created_ms

        # Model-neutral run record (plan.md)
        self._run = {
            "run_id": resolved_run_id,
            "project": resolved_project,
            "name": resolved_name,
            "stage": resolved_stage,
            "status": status,
            "created_at_ms": created_ms,
            "context": dict(self.context or {}),
            "metrics": {"events": [], "summary": []},
            "artifacts": [],
            "action_events": [],
        }
        if tags:
            self._run["tags"] = dict(tags)

        # Read owner from global config
        _cfg_path = Path("~/.cemi/config.json").expanduser()
        if _cfg_path.is_file():
            try:
                _cfg = json.loads(_cfg_path.read_text(encoding="utf-8"))
                _owner = _cfg.get("owner")
                if isinstance(_owner, str) and _owner.strip():
                    self._run["owner"] = _owner.strip()
            except Exception:
                pass

        # Legacy fields (keep existing UI working)
        self._run["id"] = resolved_run_id
        self._run["project_id"] = resolved_project
        self._run["created_at"] = created_at or _iso_from_timestamp_ms(created_ms)
        self._run["started_at"] = started_at or _now_iso()

        # reset accumulators for this run
        self._metrics = []
        self._parameters = []
        self._artifacts = []
        self._summary_metrics = {}
        self._metric_events = []
        self._metric_summary = []
        self._action_events = []
        self._sync_context_parameters()
        self._record_action_event(
            action="start_run",
            summary=resolved_name,
            output=f"status={status} run_id={resolved_run_id}",
        )
        return resolved_run_id

    def update_status(self, status: str) -> None:
        """Update run.status for the next emitted snapshot."""
        self._require_run()
        self._run["status"] = status
        self._record_action_event(
            action="update_status",
            summary=status,
            output=f"run status set to {status}",
            level="warn" if status.lower() == "running" else ("error" if status.lower() == "failed" else "success"),
        )

    def end_run(
        self,
        *,
        status: str = "succeeded",
        ended_at: Optional[str] = None,
    ) -> None:
        """Finalize run timing/state for the next emitted snapshot."""
        self._require_run()
        self._run["status"] = status
        self._run["ended_at"] = ended_at or _now_iso()
        self._run["ended_at_ms"] = _now_ms()
        self._record_action_event(
            action="end_run",
            summary=status,
            output=f"ended_at={self._run['ended_at']}",
            level="error" if status.lower() == "failed" else "success",
        )

    def set_times(
        self,
        *,
        created_at: Optional[str] = None,
        started_at: Optional[str] = None,
        ended_at: Optional[str] = None,
    ) -> None:
        """Override timestamps (useful if you’re mapping from an external system)."""
        self._require_run()
        if created_at is not None:
            self._run["created_at"] = created_at
        if started_at is not None:
            self._run["started_at"] = started_at
        if ended_at is not None:
            self._run["ended_at"] = ended_at
        self._record_action_event(
            action="set_times",
            summary="timestamps updated",
            output=_compact_json(
                {
                    "created_at": created_at,
                    "started_at": started_at,
                    "ended_at": ended_at,
                }
            ),
        )

    # ----------------------------
    # Owner / tags / notes
    # ----------------------------
    def set_notes(self, notes: str) -> None:
        """Set payload.notes."""
        self._require_run()
        self._run["notes"] = notes
        self._record_action_event(action="set_notes", summary="notes", output=notes)

    def set_tags(self, tags: Dict[str, str]) -> None:
        """Replace payload.tags entirely."""
        self._require_run()
        self._run["tags"] = dict(tags)
        self._record_action_event(
            action="set_tags",
            summary=f"{len(tags)} tags",
            output=_compact_json(tags),
        )

    def add_tag(self, key: str, value: str) -> None:
        """Upsert a single tag key/value."""
        self._require_run()
        tags = self._run.get("tags")
        if not isinstance(tags, dict):
            tags = {}
            self._run["tags"] = tags
        tags[key] = value
        self._record_action_event(action="add_tag", summary=key, output=str(value))

    # ----------------------------
    # Lineage
    # ----------------------------
    def set_lineage(
        self,
        *,
        baseline_run_id: Optional[str] = None,
        parent_run_id: Optional[str] = None,
    ) -> None:
        """Set baseline_run_id and/or parent_run_id."""
        self._require_run()
        if baseline_run_id is not None:
            self._run["baseline_run_id"] = baseline_run_id
        if parent_run_id is not None:
            self._run["parent_run_id"] = parent_run_id
        self._record_action_event(
            action="set_lineage",
            summary="lineage",
            output=_compact_json(
                {
                    "baseline_run_id": baseline_run_id,
                    "parent_run_id": parent_run_id,
                }
            ),
        )

    # ----------------------------
    # Structured notebook context
    # ----------------------------
    def set_case(self, **values: JSONValue) -> dict[str, JSONValue]:
        """Alias for `writer.case.set(...)`."""
        return self.case.set(**values)

    def set_policy(self, **values: JSONValue) -> dict[str, JSONValue]:
        """Alias for `writer.policy.set(...)`."""
        return self.policy.set(**values)

    def set_device(self, **values: JSONValue) -> dict[str, JSONValue]:
        """Alias for `writer.device.set(...)`."""
        return self.device.set(**values)

    # ----------------------------
    # Summary metrics (aggregates)
    # ----------------------------
    def log_summary_metric(self, key: str, value: JSONScalar, *, _record_action: bool = True) -> None:
        """
        Set/overwrite a summary metric (payload.summary_metrics[key] = value).
        """
        self._require_run()
        # In v1 we keep it flat + scalar
        self._summary_metrics[key] = value
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            # Also populate model-neutral summary list with minimal metadata.
            self._metric_summary.append(
                {
                    "run_id": self._run_id,
                    "project": self._project,
                    "stage": self._stage,
                    "name": key,
                    "value": float(value),
                    "unit": "",
                    "role": "custom",
                    "aggregation": "last",
                    "direction": "none",
                    "timestamp_ms": _now_ms(),
                }
            )
        if _record_action:
            self._record_action_event(
                action="log_summary_metric",
                summary=key,
                output=f"value={value}",
            )

    def log_summary_metrics(self, metrics: Dict[str, JSONScalar], *, _record_action: bool = True) -> None:
        """Bulk upsert summary metrics."""
        self._require_run()
        for k, v in metrics.items():
            self._summary_metrics[k] = v
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                self._metric_summary.append(
                    {
                        "run_id": self._run_id,
                        "project": self._project,
                        "stage": self._stage,
                        "name": k,
                        "value": float(v),
                        "unit": "",
                        "role": "custom",
                        "aggregation": "last",
                        "direction": "none",
                        "timestamp_ms": _now_ms(),
                    }
                )
        if _record_action:
            self._record_action_event(
                action="log_summary_metrics",
                summary=f"{len(metrics)} metrics",
                output=_compact_json(metrics),
            )

    def log_scalar(
        self,
        key: str,
        value: Union[int, float],
        unit: str = "",
        *,
        _record_action: bool = True,
    ) -> None:
        """
        Log a scalar value for table-only display (no chart widgets).

        Use this for single-value metrics that should appear only as columns in the
        runs table, e.g. memory_usage_mb, model_size_mb, throughput_p50, throughput_p95,
        throughput_p99, params_b. Values are stored in summary_metrics and shown in the
        runs table; they are not used for metric charts/widgets (which use log_metric
        time-series data).

        Args:
            key: Metric name (e.g. "memory_usage_mb", "model_size_mb", "throughput_p99").
            value: Numeric value.
            unit: Optional unit for display (e.g. "MB", "B", "").
        """
        self._require_run()
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("log_scalar value must be numeric.")
        self._summary_metrics[key] = value
        self._metric_summary.append(
            {
                "run_id": self._run_id,
                "project": self._project,
                "stage": self._stage,
                "name": key,
                "value": float(value),
                "unit": unit or "",
                "role": "custom",
                "aggregation": "last",
                "direction": "none",
                "timestamp_ms": _now_ms(),
            }
        )
        if _record_action:
            self._record_action_event(
                action="log_scalar",
                summary=key,
                output=f"value={value}{f' {unit}' if unit else ''}",
            )

    def log_scalars(
        self,
        scalars: Dict[str, Union[int, float]],
        units: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Log multiple scalar values (table-only). See log_scalar().

        Args:
            scalars: Map of metric name -> numeric value.
            units: Optional map of metric name -> unit string (e.g. {"memory_usage_mb": "MB"}).
        """
        units = units or {}
        for k, v in scalars.items():
            self.log_scalar(k, v, unit=units.get(k, ""), _record_action=False)
        if scalars:
            self._record_action_event(
                action="log_scalars",
                summary=f"{len(scalars)} scalars",
                output=_compact_json(scalars),
            )

    # ----------------------------
    # MLPerf-style helpers (benchmarks)
    # ----------------------------
    def log_benchmark_config(
        self,
        *,
        benchmark_task: Optional[str] = None,
        benchmark_scenario: Optional[str] = None,
        benchmark_division: Optional[str] = None,
        system_type: Optional[str] = None,
        samples_per_query: Optional[int] = None,
        target_duration_s: Optional[float] = None,
        min_queries: Optional[int] = None,
    ) -> None:
        """
        Convenience wrapper to log MLPerf-style benchmark context as parameters.

        Examples:
          - benchmark_task: "resnet50", "bert", "ssd-mobilenet"
          - benchmark_scenario: "single_stream", "multi_stream", "server", "offline"
          - benchmark_division: "closed", "open"
          - system_type: "edge", "datacenter"
        """
        self._require_run()

        def _param(key: str, value: JSONValue) -> None:
            self.log_parameter(key=key, value=value, _record_action=False)

        if benchmark_task is not None:
            _param("benchmark_task", benchmark_task)
        if benchmark_scenario is not None:
            _param("benchmark_scenario", benchmark_scenario)
        if benchmark_division is not None:
            _param("benchmark_division", benchmark_division)
        if system_type is not None:
            _param("system_type", system_type)
        if samples_per_query is not None:
            _param("samples_per_query", samples_per_query)
        if target_duration_s is not None:
            _param("target_duration_s", target_duration_s)
        if min_queries is not None:
            _param("min_queries", min_queries)
        self._record_action_event(
            action="log_benchmark_config",
            summary="benchmark config",
            output=_compact_json(
                {
                    "benchmark_task": benchmark_task,
                    "benchmark_scenario": benchmark_scenario,
                    "benchmark_division": benchmark_division,
                    "system_type": system_type,
                    "samples_per_query": samples_per_query,
                    "target_duration_s": target_duration_s,
                    "min_queries": min_queries,
                }
            ),
        )

    def log_mlperf_summary(
        self,
        *,
        latency_p90_ms: Optional[float] = None,
        latency_p99_ms: Optional[float] = None,
        throughput_ips: Optional[float] = None,
        accuracy: Optional[float] = None,
        f1: Optional[float] = None,
        extra: Optional[Dict[str, JSONScalar]] = None,
    ) -> None:
        """
        Log MLPerf-style aggregate metrics into summary_metrics.

        This is a thin wrapper around log_summary_metrics(). Only keys with
        non-None values are written.
        """
        self._require_run()
        metrics: Dict[str, JSONScalar] = {}
        if latency_p90_ms is not None:
            metrics["latency_p90_ms"] = latency_p90_ms
        if latency_p99_ms is not None:
            metrics["latency_p99_ms"] = latency_p99_ms
        if throughput_ips is not None:
            metrics["throughput_ips"] = throughput_ips
        if accuracy is not None:
            metrics["accuracy"] = accuracy
        if f1 is not None:
            metrics["f1"] = f1
        if extra:
            for k, v in extra.items():
                metrics[k] = v
        if metrics:
            self.log_summary_metrics(metrics, _record_action=False)
            self._record_action_event(
                action="log_mlperf_summary",
                summary=f"{len(metrics)} summary metrics",
                output=_compact_json(metrics),
            )

    def log_latency_sample(
        self,
        *,
        latency_ms: float,
        step: Optional[int] = None,
        scenario: Optional[str] = None,
    ) -> None:
        """
        Convenience wrapper to record a single latency sample as a metric.

        By default logs under "latency_ms". When scenario is provided, logs under
        a namespaced key like "latency/single_stream_ms".
        """
        name = "latency_ms"
        if scenario:
            name = f"latency/{scenario}_ms"
        self.log_metric(name=name, value=latency_ms, step=step, _record_action=False)
        self._record_action_event(
            action="log_latency_sample",
            summary=name,
            output=f"value={latency_ms}ms step={step if step is not None else 'n/a'}",
        )

    def log_operator_hotspot(
        self,
        *,
        operator: str,
        time_ms: float,
        percentage: float,
        index: Optional[int] = None,
    ) -> None:
        """
        Record a coarse operator hotspot as parameters.

        This is intentionally simple and schema-compatible: callers can emit a
        small, fixed number of hotspots which future UIs can surface.
        """
        self._require_run()
        prefix = f"operator_hotspot.{index}" if index is not None else f"operator_hotspot.{operator}"
        self.log_parameter(key=f"{prefix}.operator", value=operator, _record_action=False)
        self.log_parameter(key=f"{prefix}.time_ms", value=time_ms, _record_action=False)
        self.log_parameter(key=f"{prefix}.percentage", value=percentage, _record_action=False)
        self._record_action_event(
            action="log_operator_hotspot",
            summary=operator,
            output=f"time_ms={time_ms} percentage={percentage}",
        )

    # ----------------------------
    # Parameters (hyperparams/config)
    # ----------------------------
    def log_parameter(
        self,
        *,
        key: str,
        value: JSONValue,
        value_type: Optional[str] = None,
        id: Optional[str] = None,
        run_id: Optional[str] = None,
        _record_action: bool = True,
    ) -> None:
        """
        Append a parameter record to the run snapshot.

        Parameters are intended for configuration, hyperparameters, and other
        descriptive inputs that do not vary as a time series.
        """
        self._require_run()
        record: Dict[str, Any] = {
            "key": key,
            "value": value,
            "value_type": value_type or _infer_value_type(value),
        }
        if id is not None:
            record["id"] = id
        if run_id is not None:
            record["run_id"] = run_id
        self._parameters.append(record)
        if _record_action:
            self._record_action_event(
                action="log_parameter",
                summary=key,
                output=f"value={_compact_json(value)}",
            )

    # ----------------------------
    # Metrics (time-series / step-based)
    # ----------------------------
    def log_metric(
        self,
        *,
        name: str,
        value: Union[int, float],
        step: Optional[int] = None,
        timestamp: Optional[str] = None,
        timestamp_ms: Optional[int] = None,
        unit: Optional[str] = None,
        source: Optional[str] = None,
        role: Optional[str] = None,
        aggregation: Optional[str] = None,
        direction: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        _record_action: bool = True,
    ) -> None:
        """
        Log a numeric metric event and keep legacy compatibility fields in sync.

        If `aggregation == "raw"` the value is treated as an event in the main
        metric stream. Non-raw aggregations still flow through the legacy metric
        list so existing UI surfaces can read them.
        """
        self._require_run()
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("Metric value must be numeric.")

        role_v = (role or "custom").strip().lower()
        if role_v not in self._ROLE_VALUES:
            raise ValueError(f"role must be one of {sorted(self._ROLE_VALUES)}")
        agg_v = (aggregation or "raw").strip().lower()
        if agg_v not in self._AGG_VALUES:
            raise ValueError(f"aggregation must be one of {sorted(self._AGG_VALUES)}")
        dir_v = (direction or "none").strip().lower()
        if dir_v not in self._DIR_VALUES:
            raise ValueError(f"direction must be one of {sorted(self._DIR_VALUES)}")

        ts_ms = int(timestamp_ms) if isinstance(timestamp_ms, int) else _now_ms()
        ts_iso = timestamp or _iso_from_timestamp_ms(ts_ms)

        # Model-neutral MetricEvent
        ev: Dict[str, Any] = {
            "run_id": self._run_id,
            "project": self._project,
            "stage": self._stage,
            "name": name,
            "value": float(value),
            "unit": unit or "",
            "role": role_v,
            "aggregation": agg_v,
            "direction": dir_v,
            "timestamp_ms": ts_ms,
        }
        if step is not None:
            ev["step"] = step
        if tags is not None:
            ev["tags"] = dict(tags)

        # plan.md: MetricEvent is the raw event stream (time series or single measurement)
        self._metric_events.append(ev)

        # Legacy compat: also append to payload.metrics list
        legacy: Dict[str, Any] = {"name": name, "value": float(value), "timestamp": ts_iso}
        if step is not None:
            legacy["step"] = step
        if unit:
            legacy["unit"] = unit
        if source:
            legacy["source"] = source
        legacy["timestamp_ms"] = ts_ms
        legacy["role"] = role_v
        legacy["aggregation"] = agg_v
        legacy["direction"] = dir_v
        if tags:
            legacy["tags"] = dict(tags)
        self._metrics.append(legacy)
        if _record_action:
            output = f"value={float(value)}"
            if step is not None:
                output += f" step={step}"
            if unit:
                output += f" unit={unit}"
            self._record_action_event(
                action="log_metric",
                summary=name,
                output=output,
            )

    def log_summary(
        self,
        *,
        name: str,
        value: Union[int, float],
        aggregation: str,
        role: str,
        unit: str = "",
        direction: str = "none",
        tags: Optional[Dict[str, str]] = None,
    ) -> None:
        """Log a typed aggregate directly into `metrics.summary`.

        Use this for already-aggregated values such as p50 latency, final model
        size, or last-step accuracy.
        """
        self._require_run()
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("Metric value must be numeric.")
        role_v = (role or "custom").strip().lower()
        if role_v not in self._ROLE_VALUES:
            raise ValueError(f"role must be one of {sorted(self._ROLE_VALUES)}")
        agg_v = (aggregation or "raw").strip().lower()
        if agg_v not in self._AGG_VALUES:
            raise ValueError(f"aggregation must be one of {sorted(self._AGG_VALUES)}")
        dir_v = (direction or "none").strip().lower()
        if dir_v not in self._DIR_VALUES:
            raise ValueError(f"direction must be one of {sorted(self._DIR_VALUES)}")

        ts_ms = _now_ms()
        ev: Dict[str, Any] = {
            "run_id": self._run_id,
            "project": self._project,
            "stage": self._stage,
            "name": name,
            "value": float(value),
            "unit": unit or "",
            "role": role_v,
            "aggregation": agg_v,
            "direction": dir_v,
            "timestamp_ms": ts_ms,
        }
        if tags is not None:
            ev["tags"] = dict(tags)
        self._metric_summary.append(ev)

        # Keep legacy summary_metrics dict useful
        self._summary_metrics[name] = float(value)
        self._record_action_event(
            action="log_summary",
            summary=name,
            output=f"value={float(value)} aggregation={agg_v}",
        )

    # ----------------------------
    # Artifacts
    # ----------------------------
    def add_artifact(
        self,
        *,
        kind: str,
        name: str,
        uri: str,
        media_type: str,
        id: Optional[str] = None,
        hash: Optional[str] = None,
    ) -> None:
        """
        Append an artifact record to payload.artifacts.
        """
        self._require_run()
        artifact_id = id or f"{self._run_id}:{name}:{uuid.uuid4().hex[:8]}"
        a: Dict[str, Any] = {
            "kind": kind,
            "type": kind,
            "name": name,
            "uri": uri,
            "media_type": media_type,
            "created_at": _now_iso(),
            "id": artifact_id,
        }
        if hash is not None:
            a["hash"] = hash
        self._artifacts.append(a)
        self._record_action_event(
            action="add_artifact",
            summary=name,
            output=f"kind={kind} uri={uri}",
            level="success",
        )

    def add_local_file_artifact(
        self,
        *,
        path: str | Path,
        kind: str,
        name: str | None = None,
        media_type: str | None = None,
    ) -> dict[str, Any]:
        """
        Copy a local file into the CEMI artifact store and register it as an artifact.

        Default store: .cemi/artifacts/<run_id>/<filename>
        The local gateway serves artifacts at /api/runs/<run_id>/artifacts/<filename>
        (base URL is set from the gateway port at startup).

        Returns:
            The artifact record that was appended to the run snapshot.
        """
        self._require_run()
        src = Path(path).expanduser()
        if not src.is_file():
            raise FileNotFoundError(str(src))

        filename = name or src.name
        artifacts_root = Path(self.save_dir or DEFAULT_SAVE_DIR).expanduser() / "artifacts"
        dst_dir = artifacts_root / str(self._run_id)
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / filename
        shutil.copy2(src, dst)

        size_bytes = dst.stat().st_size
        mt = media_type or mimetypes.guess_type(dst.name)[0] or "application/octet-stream"

        # Use same gateway URL as CLI; set CEMI_LOCAL_SERVER_URL if gateway runs on another port
        base = os.environ.get("CEMI_LOCAL_SERVER_URL", default_gateway_base_url()).rstrip("/")
        uri = f"{base}/api/runs/{self._run_id}/artifacts/{filename}"

        a: Dict[str, Any] = {
            "kind": kind,
            "type": kind,
            "name": filename,
            "uri": uri,
            "media_type": mt,
            "size_bytes": size_bytes,
            "created_at": _now_iso(),
            "id": f"{self._run_id}:{filename}:{uuid.uuid4().hex[:8]}",
        }
        self._artifacts.append(a)
        self._record_action_event(
            action="add_local_file_artifact",
            summary=filename,
            output=f"kind={kind} uri={uri}",
            level="success",
        )
        return a

    # ----------------------------
    # Emission
    # ----------------------------
    def emit_run_record(self) -> Dict[str, Any]:
        """
        Emit the current run snapshot to the configured sink.

        This does not end the run. Call it whenever you want the current
        notebook or script state to become visible to downstream readers such as
        the local gateway and UI.

        Returns:
            The full event dictionary that was written to the sink.
        """
        self._require_run()
        self._record_action_event(
            action="emit_run_record",
            summary="snapshot",
            output="run_record emitted to sink",
        )
        payload = dict(self._run)

        # Model-neutral attachments (always include lists)
        metrics_obj = payload.get("metrics")
        if not isinstance(metrics_obj, dict):
            metrics_obj = {"events": [], "summary": []}
            payload["metrics"] = metrics_obj
        metrics_obj["events"] = list(self._metric_events)
        metrics_obj["summary"] = list(self._metric_summary)

        payload["artifacts"] = list(self._artifacts)
        payload["action_events"] = list(self._action_events)

        # Legacy attachments for existing UI
        if self._summary_metrics:
            payload["summary_metrics"] = dict(self._summary_metrics)
        if self._parameters:
            payload["parameters"] = list(self._parameters)
            payload["params"] = list(self._parameters)
        if self._metrics:
            payload["legacy_metrics"] = list(self._metrics)

        event = {
            "type": "run_record",
            "schema_version": self.schema_version,
            "payload": payload,
        }
        self.sink.write(event)
        return event

    # ----------------------------
    # Helpers
    # ----------------------------
    def _require_run(self) -> None:
        if not self._run or "id" not in self._run:
            raise RuntimeError("No active run. Call start_run(...) first.")

    def _set_context_section(self, section_name: str, values: dict[str, JSONValue]) -> dict[str, JSONValue]:
        """Merge a context section and mirror it into compatibility parameters."""
        filtered = {key: value for key, value in values.items() if value is not None}
        existing = self.context.get(section_name)
        resolved_existing = dict(existing) if isinstance(existing, dict) else {}
        resolved_existing.update(filtered)
        self.context[section_name] = resolved_existing

        if self._run:
            run_context = self._run.get("context")
            if not isinstance(run_context, dict):
                run_context = {}
                self._run["context"] = run_context
            run_section = run_context.get(section_name)
            resolved_run_section = dict(run_section) if isinstance(run_section, dict) else {}
            resolved_run_section.update(filtered)
            run_context[section_name] = resolved_run_section
            self._mirror_context_section_to_parameters(section_name, filtered)
            if filtered:
                self._record_action_event(
                    action=f"set_{section_name}",
                    summary=section_name,
                    output=_compact_json(filtered),
                )

        return resolved_existing

    def _record_action_event(
        self,
        *,
        action: str,
        summary: str,
        output: str = "",
        level: str = "info",
    ) -> None:
        self._require_run()
        timestamp_ms = _now_ms()
        event = {
            "id": f"{self._run_id}:action:{len(self._action_events) + 1}",
            "timestamp_ms": timestamp_ms,
            "timestamp": _iso_from_timestamp_ms(timestamp_ms),
            "action": action,
            "summary": summary,
            "output": output,
            "level": level,
            "device": self._current_device_label(),
            "run_id": self._run_id,
            "run_name": self._run.get("name") or self._run_id,
        }
        self._action_events.append(event)

    def _current_device_label(self) -> str:
        context = self._run.get("context")
        if isinstance(context, dict):
            device = context.get("device")
            if isinstance(device, dict):
                for key in ("board", "runtime", "memory_budget", "flash_budget", "ram_budget"):
                    value = device.get(key)
                    if value not in (None, ""):
                        return str(value)

        target_profile = self._run.get("target_profile")
        if isinstance(target_profile, dict):
            name = target_profile.get("name")
            if isinstance(name, str) and name.strip():
                return name.strip()

        tags = self._run.get("tags")
        if isinstance(tags, dict):
            for key in ("device", "runtime"):
                value = tags.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()

        return "n/a"

    def _sync_context_parameters(self) -> None:
        for section_name in self._CONTEXT_PARAM_PREFIXES:
            values = self.context.get(section_name)
            if isinstance(values, dict):
                self._mirror_context_section_to_parameters(section_name, values)

    def _mirror_context_section_to_parameters(self, section_name: str, values: dict[str, JSONValue]) -> None:
        prefix = self._CONTEXT_PARAM_PREFIXES.get(section_name)
        if not prefix:
            return
        for key, value in values.items():
            self._upsert_parameter(key=f"{prefix}.{key}", value=value)

    def _upsert_parameter(self, *, key: str, value: JSONValue, value_type: Optional[str] = None) -> None:
        resolved_value_type = value_type or _infer_value_type(value)
        for record in self._parameters:
            if record.get("key") == key:
                record["value"] = value
                record["value_type"] = resolved_value_type
                return
        self._parameters.append(
            {
                "key": key,
                "value": value,
                "value_type": resolved_value_type,
            }
        )
