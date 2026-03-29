# CEMI Local Run Contract (v1)

This file defines the **single source of truth** for how local CEMI runs behave
across the Writer, gateway, CLI, UI, and external repos (e.g. compression-engine).

It is intentionally small and strict. Anything not described here is not part of
the supported behavior.

---

## 1. Identity and storage

- Each **run** has:
  - `run_id: string` — unique per run file.
  - `project: string` — project identifier (UI groups by this).
  - `stage: string` — optional stage/environment label (e.g. `benchmark`).
- Storage layout (all relative to `save_dir`):
  - Run file: `save_dir/runs/<run_id>.jsonl`
  - Artifacts: `save_dir/artifacts/<run_id>/<filename>`
- The Writer is responsible for:
  - Choosing `run_id` if the caller does not pass one.
  - Writing **one JSON object per line** to the run file.

---

## 2. Event model and `emit_run_record`

- Event type: `run_record`
- Schema version: `"2.0"` (string)
- Shape of each event:

```json
{
  "type": "run_record",
  "schema_version": "2.0",
  "payload": {
    "run_id": "string",
    "project": "string",
    "name": "string",
    "stage": "string",
    "status": "string",
    "created_at_ms": 1730000000000,
    "context": { "...": "..." },
    "metrics": {
      "events": [
        {
          "run_id": "string",
          "project": "string",
          "stage": "string",
          "name": "metric_name",
          "value": 0.0,
          "step": 1,
          "unit": "",
          "role": "custom",
          "aggregation": "raw",
          "direction": "none",
          "timestamp_ms": 1730000000000
        }
      ],
      "summary": [
        {
          "run_id": "string",
          "project": "string",
          "stage": "string",
          "name": "summary_name",
          "value": 0.0,
          "unit": "",
          "role": "custom",
          "aggregation": "last",
          "direction": "none",
          "timestamp_ms": 1730000000000
        }
      ]
    },
    "artifacts": [
      {
        "kind": "model",
        "type": "model",
        "name": "model.onnx",
        "uri": "http://127.0.0.1:3141/api/runs/<run_id>/artifacts/model.onnx",
        "media_type": "application/octet-stream",
        "size_bytes": 1234,
        "created_at": "2024-10-10T10:00:00Z",
        "id": "<run_id>:model.onnx:abcd1234"
      }
    ],
    "summary_metrics": {
      "final_accuracy": 0.95,
      "memory_usage_mb": 512,
      "model_size_mb": 42.1,
      "throughput_p99": 1200,
      "params_b": 0.06
    },
    "parameters": [
      { "key": "batch_size", "value": 32 }
    ],
    "tags": {
      "model": "resnet18",
      "dataset": "MNIST"
    }
  }
}
```

### Contract for `emit_run_record()`:

- Each call **must**:
  - Produce a complete snapshot (including all metric events seen so far).
  - Append **one line** to the run file.
  - Keep `created_at_ms` monotonically non-decreasing across snapshots.
- The Writer **may**:
  - Buffer metric events between emissions.
  - Emit more frequently for “live” views (e.g. per epoch).

---

## 3. Gateway responsibilities

- Gateway reads only from `save_dir/runs/*.jsonl` and does not invent runs.
- For each run file:
  - Use the **last** valid `run_record` as the current snapshot.
  - For v2 payloads:
    - Expose `run.metrics` to the UI as:

      ```ts
      type MetricPoint = { name?: string; step?: number; value: number; timestamp_ms?: number };
      // run.metrics: MetricPoint[]
      ```

      by setting `run["metrics"] = payload.metrics.events || []`.
  - For v1 payloads:
    - Adapt legacy structures into the same `run.metrics: MetricPoint[]` array.
- `/api/projects` and `/api/projects/:id/runs`:
  - Derive projects and runs **only** from the loaded snapshots.
  - If the runs directory exists but there are no run files (or none parse), return no projects so the UI shows "No projects found. Create your first project to get started."

---

## 4. CLI responsibilities (local mode)

- `cemi start --save-dir <dir> --project <project> -- python <script>` **must**:
  - Ensure a local gateway is serving `save_dir=<dir>` on port 3141.
  - Set these env vars for the child process:
    - `CEMI_PROJECT_ID = <project> or "default"`
    - `CEMI_RUN_ID = "local-<random>"` (the parent’s run identifier; children are free to create additional runs with their own `run_id`s).
    - `CEMI_SAVE_DIR = <dir>`
    - `CEMI_LOCAL_SERVER_URL = http://127.0.0.1:3141`
- The CLI **must not** attempt to reinterpret or rewrite run files; it only orchestrates gateways and child processes.

---

## 5. External repos (e.g. compression-engine)

When integrating CEMI from another repo:

- Create a writer using either:
  - `create_writer(project=\"...\", log_dir=\"...\")` when running the script directly, or
  - `create_writer_from_env()` when running under `cemi start`.
- For each logical run (e.g. per model):
  - Call `start_run(name=..., tags=..., run_id=optional_custom_id)`.
  - Log parameters once at the beginning.
  - Log metrics over time (per step/epoch) with `log_metric()` for chart widgets.
  - Use `log_scalar(key, value, unit=...)` for table-only values (e.g. memory_usage_mb, model_size_mb, throughput_p50/p95/p99, params_b); these appear only as columns in the runs table, not as charts.
  - Call `emit_run_record()` periodically (e.g. per epoch) so the UI can see progress.
  - At the end, call `log_summary_metrics(...)` or `log_scalar(...)` as needed, `end_run(status=...)`, `emit_run_record()`.

As long as the writer and gateway adhere to this contract, the UI will see:

- One run per run file.
- An array of metric points for charts.
- Updated snapshots as training progresses.

