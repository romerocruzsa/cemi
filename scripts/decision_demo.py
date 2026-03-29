#!/usr/bin/env python3
"""
End-to-end local demo for the Contract + Recommendation layer.

Creates:
  - a baseline run
  - two variant runs
  - a .cemi/contract.json

Then you can open the workspace and see the recommendation panel on the Runs page.
"""

from __future__ import annotations

import json
import os
import random
import time
import uuid
from pathlib import Path

from cemi.writer import create_writer_from_env


def _write_contract(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    contract = {
        "contract_id": "demo-contract",
        "project": "acme-voice",
        "name": "Prod ASR - Server SLA",
        "quality": {
            "metric": "delta_wer",
            "direction": "lower_is_better",
            "operator": "<=",
            "threshold": 0.05,
            "notes": "WER must not worsen by more than +5 absolute points",
        },
        "performance": [
            {
                "scenario": "server",
                "metric": "latency_p99_ms",
                "operator": "<=",
                "threshold": 300,
                "unit": "ms",
            }
        ],
        "resources": [
            {"metric": "peak_gpu_mem_gb", "operator": "<=", "threshold": 24}
        ],
        "cost": {
            "output_unit": "outputs",
            "throughput_metric": "throughput_outputs_per_s",
            "price_per_hour_metric": "price_per_hour_usd",
            "derive_cost_per_output": True,
        },
    }
    path.write_text(json.dumps(contract, indent=2), encoding="utf-8")


def _log_run(*, variant: str, device: str, delta_wer: float, latency_p99_ms: float, throughput: float, price_per_hour_usd: float, peak_gpu_mem_gb: float) -> str:
    run_id = f"demo-{uuid.uuid4().hex[:12]}"

    writer = create_writer_from_env(project="acme-voice", save_dir=".cemi")
    writer.start_run(
        name=f"benchmark_server_{device}_{variant}",
        tags={"scenario": "server", "device": device, "variant": variant},
        run_id=run_id,
        status="succeeded",
    )

    # Summary metrics (plan.md style)
    writer.log_summary(
        name="delta_wer",
        value=float(delta_wer),
        unit="abs",
        role="quality",
        aggregation="mean",
        direction="lower_is_better",
    )
    writer.log_summary(
        name="latency_p99_ms",
        value=float(latency_p99_ms),
        unit="ms",
        role="performance",
        aggregation="p99",
        direction="lower_is_better",
        tags={"scenario": "server"},
    )
    writer.log_summary(
        name="throughput_outputs_per_s",
        value=float(throughput),
        unit="outputs/s",
        role="performance",
        aggregation="mean",
        direction="higher_is_better",
        tags={"scenario": "server"},
    )
    writer.log_summary(
        name="peak_gpu_mem_gb",
        value=float(peak_gpu_mem_gb),
        unit="GB",
        role="resource",
        aggregation="max",
        direction="lower_is_better",
    )
    writer.log_summary(
        name="price_per_hour_usd",
        value=float(price_per_hour_usd),
        unit="USD/hour",
        role="cost",
        aggregation="raw",
        direction="none",
    )

    # Raw events (optional): emit a small synthetic latency event stream
    for step in range(1, 51):
        latency = max(1.0, random.gauss(latency_p99_ms * 0.55, latency_p99_ms * 0.03))
        writer.log_metric(
            name="latency_ms",
            value=float(latency),
            unit="ms",
            role="performance",
            aggregation="raw",
            direction="lower_is_better",
            step=step,
            tags={"scenario": "server", "device": device, "variant": variant},
        )
        time.sleep(0.001)

    writer.end_run(status="succeeded")
    writer.emit_run_record()
    return run_id


def main() -> None:
    random.seed(7)

    # Ensure we write to the repo-local directory by default.
    base = Path(os.environ.get("CEMI_SAVE_DIR", ".cemi"))
    runs_dir = base / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    # Clean up prior demo runs to keep the recommendation deterministic.
    for p in runs_dir.glob("demo-*.jsonl"):
        try:
            p.unlink()
        except OSError:
            pass

    contract_path = Path(".cemi/contract.json")
    _write_contract(contract_path)

    baseline_id = _log_run(
        variant="baseline",
        device="L4",
        delta_wer=0.03,
        latency_p99_ms=280.0,
        throughput=10.0,
        price_per_hour_usd=1.50,
        peak_gpu_mem_gb=18.0,
    )
    good_id = _log_run(
        variant="int8_ptq",
        device="L4",
        delta_wer=0.04,
        latency_p99_ms=260.0,
        throughput=12.0,
        price_per_hour_usd=1.50,
        peak_gpu_mem_gb=16.0,
    )
    bad_id = _log_run(
        variant="tiny_fast",
        device="L4",
        delta_wer=0.08,  # fails quality gate
        latency_p99_ms=200.0,
        throughput=15.0,
        price_per_hour_usd=1.50,
        peak_gpu_mem_gb=12.0,
    )

    print(f"Wrote contract: {contract_path}")
    print(f"Baseline run:   {baseline_id}")
    print(f"Passing run:    {good_id}")
    print(f"Failing run:    {bad_id}")
    print("Next: run `cemi view` (or open the workspace) and check Runs → Decision panel.")


if __name__ == "__main__":
    main()

