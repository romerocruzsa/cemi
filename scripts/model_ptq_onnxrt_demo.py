#!/usr/bin/env python3
"""
Generic PTQ demo: log baseline vs int8 PTQ runs + serve ONNX artifact locally.

Principles:
- metric keys are user-defined (e.g. accuracy, loss, energy_j, etc.)
- plots default to the metric name (no hard-coded task assumptions)
- local gateway serves run JSONL + artifact bytes so the UI can visualize and load ONNX (Netron)
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path
from statistics import mean

from cemi.writer import create_writer


def _percentile(sorted_values: list[float], q: float) -> float:
    if not sorted_values:
        return 0.0
    if q <= 0:
        return sorted_values[0]
    if q >= 1:
        return sorted_values[-1]
    n = len(sorted_values)
    pos = (n - 1) * q
    lo = int(pos)
    hi = min(lo + 1, n - 1)
    if lo == hi:
        return sorted_values[lo]
    w = pos - lo
    return sorted_values[lo] * (1 - w) + sorted_values[hi] * w


def _parse_kv(s: str) -> tuple[str, float]:
    if "=" not in s:
        raise ValueError(f"Expected KEY=VALUE, got: {s}")
    k, v = s.split("=", 1)
    k = k.strip()
    if not k:
        raise ValueError(f"Empty metric key in: {s}")
    return k, float(v.strip())


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--project", default="demo", help="Project name")
    p.add_argument("--variant", choices=["baseline", "int8_ptq"], required=True)
    p.add_argument("--model-onnx", type=str, required=True, help="Path to ONNX model file")
    p.add_argument("--tag", action="append", default=[], help="Tag as KEY=VALUE (repeatable)")
    p.add_argument("--summary-metric", action="append", default=[], help="Summary metric as KEY=VALUE (repeatable, numeric)")
    p.add_argument("--num-iter", type=int, default=200, help="Timed inference iterations (if ORT installed)")
    p.add_argument("--warmup", type=int, default=20, help="Warmup iterations (if ORT installed)")
    p.add_argument("--batch", type=int, default=1, help="Batch size for timing")
    args = p.parse_args()

    model_path = Path(args.model_onnx).expanduser()
    if not model_path.is_file():
        raise SystemExit(f"ONNX model not found: {model_path}")

    tags: dict[str, str] = {"variant": args.variant, "runtime": "onnxruntime"}
    for raw in args.tag:
        k, v = raw.split("=", 1) if "=" in raw else (raw, "")
        if k.strip():
            tags[k.strip()] = v.strip()

    writer = create_writer(project=args.project, log_dir=".cemi")
    run_id = writer.start_run(name=f"{args.project}_{args.variant}", tags=tags, status="running")

    # Copy/register the ONNX artifact so the UI can fetch it for Netron.
    writer.add_local_file_artifact(path=model_path, kind="model")

    # User-provided summary metrics (task-specific, arbitrary keys).
    user_summary: dict[str, float] = {}
    for raw in args.summary_metric:
        k, v = _parse_kv(raw)
        user_summary[k] = v
    if user_summary:
        writer.log_summary_metrics(user_summary)

    # Optional: ORT timing to populate latency/throughput metrics.
    try:
        import numpy as np  # type: ignore
        import onnxruntime as ort  # type: ignore

        sess = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        inp = sess.get_inputs()[0]
        input_name = inp.name
        shape = [d if isinstance(d, int) else 1 for d in (inp.shape or [])]
        if len(shape) >= 1:
            shape[0] = args.batch
        x = np.random.rand(*shape).astype("float32")

        for _ in range(max(0, args.warmup)):
            sess.run(None, {input_name: x})

        times_ms: list[float] = []
        t0 = time.perf_counter()
        for i in range(max(1, args.num_iter)):
            s = time.perf_counter()
            sess.run(None, {input_name: x})
            e = time.perf_counter()
            ms = (e - s) * 1000.0
            times_ms.append(ms)
            writer.log_metric(name="latency_ms", value=float(ms), step=i + 1, unit="ms")
        t1 = time.perf_counter()

        times_ms.sort()
        p50 = _percentile(times_ms, 0.50)
        p90 = _percentile(times_ms, 0.90)
        p95 = _percentile(times_ms, 0.95)
        p99 = _percentile(times_ms, 0.99)
        throughput_ips = (args.batch * len(times_ms)) / max(1e-9, (t1 - t0))

        writer.log_summary_metrics(
            {
                "latency_p50_ms": float(p50),
                "latency_p90_ms": float(p90),
                "latency_p95_ms": float(p95),
                "latency_p99_ms": float(p99),
                "throughput_ips": float(throughput_ips),
                "latency_mean_ms": float(mean(times_ms)),
            }
        )
    except Exception:
        pass

    writer.end_run(status="succeeded")
    writer.emit_run_record()
    print(f"Run written: {run_id}")


if __name__ == "__main__":
    main()

