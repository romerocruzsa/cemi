#!/usr/bin/env python3
"""
Test: Multi-model benchmark loop with CEMI writer.

Simulates the core pattern from the compression-engine testbed: a single Writer
instance is created once, then start_run/end_run is called per model in a loop.
Each model gets its own training metrics, compression summary, and run record.
This is the pattern that exposed the multi-run bugs.

Full user flow with gateway (create_writer + cemi gateway + API) is exercised
in test_multi_model_gateway_e2e.py.
"""

import json
import math
from pathlib import Path

import pytest

from cemi.writer import Writer, LocalFileSink


class _CollectSink:
    def __init__(self) -> None:
        self.records: list[dict] = []

    def write(self, record: dict) -> None:
        self.records.append(record)


MODELS = [
    {"name": "resnet18", "size_mb": 44.6, "int8_size_mb": 11.2},
    {"name": "mobilenetv2", "size_mb": 13.6, "int8_size_mb": 3.5},
    {"name": "vit-tiny", "size_mb": 21.3, "int8_size_mb": 5.5},
]


def _simulate_training(model_idx: int, num_epochs: int):
    """Return list of (train_loss, train_acc, val_loss, val_acc, val_f1) per epoch."""
    epochs = []
    for epoch in range(num_epochs):
        progress = (epoch + 1) / num_epochs
        base_acc = 0.6 + model_idx * 0.05
        train_loss = 2.3 * math.exp(-2.5 * progress) + 0.03 * (model_idx + 1)
        train_acc = base_acc + (0.95 - base_acc) * (1 - math.exp(-3.0 * progress))
        val_loss = train_loss * 1.15
        val_acc = train_acc * 0.97
        val_f1 = val_acc * 0.99
        epochs.append((train_loss, train_acc, val_loss, val_acc, val_f1))
    return epochs


def _simulate_compression(model_info: dict, final_val_acc: float):
    """Simulate PTQ compression results for FP32 vs INT8."""
    return {
        "fp32_accuracy": final_val_acc,
        "fp32_latency_ms": 12.5 + model_info["size_mb"] * 0.1,
        "fp32_model_size_mb": model_info["size_mb"],
        "int8_accuracy": final_val_acc * 0.98,
        "int8_latency_ms": 4.2 + model_info["int8_size_mb"] * 0.08,
        "int8_model_size_mb": model_info["int8_size_mb"],
    }


def test_multi_model_benchmark_produces_separate_runs() -> None:
    """
    One Writer, 3 models in a loop. Each model must produce a distinct run
    with its own run_id, parameters, epoch metrics, and compression summary.
    """
    sink = _CollectSink()
    writer = Writer(sink=sink, project="compression-engine", stage="benchmark")

    num_epochs = 100
    run_ids = []

    for model_idx, model_info in enumerate(MODELS):
        model_name = model_info["name"]

        rid = writer.start_run(
            name=f"{model_name}_mnist_ptq",
            tags={"model": model_name, "dataset": "MNIST", "method": "ptq"},
        )
        run_ids.append(rid)

        writer.log_parameter(key="num_epochs", value=num_epochs)
        writer.log_parameter(key="batch_size", value=32)
        writer.log_parameter(key="learning_rate", value=1e-4)
        writer.log_parameter(key="device", value="cpu")
        writer.log_parameter(key="model_name", value=model_name)

        epoch_results = _simulate_training(model_idx, num_epochs)
        for epoch_idx, (t_loss, t_acc, v_loss, v_acc, v_f1) in enumerate(epoch_results):
            writer.log_metric(name="train_loss", value=t_loss, step=epoch_idx + 1)
            writer.log_metric(name="train_accuracy", value=t_acc, step=epoch_idx + 1)
            writer.log_metric(name="val_loss", value=v_loss, step=epoch_idx + 1)
            writer.log_metric(name="val_accuracy", value=v_acc, step=epoch_idx + 1)
            writer.log_metric(name="val_f1", value=v_f1, step=epoch_idx + 1)

        writer.emit_run_record()

        final_val_acc = epoch_results[-1][3]
        summary = _simulate_compression(model_info, final_val_acc)
        summary["benchmark_time_seconds"] = 42.0 + model_idx * 10
        writer.log_summary_metrics(summary)
        writer.end_run(status="succeeded")
        writer.emit_run_record()

    assert len(run_ids) == 3
    assert len(set(run_ids)) == 3, f"Run IDs must be unique: {run_ids}"

    emitted = [r for r in sink.records if r["type"] == "run_record"]
    # 2 emit_run_record() per model = 6 total events
    assert len(emitted) == 6

    final_events = emitted[1::2]
    for i, ev in enumerate(final_events):
        payload = ev["payload"]
        assert payload["run_id"] == run_ids[i]
        assert payload["status"] == "succeeded"

        sm = payload.get("summary_metrics", {})
        assert "fp32_accuracy" in sm
        assert "int8_accuracy" in sm
        assert "fp32_model_size_mb" in sm
        assert "int8_model_size_mb" in sm
        assert sm["int8_accuracy"] < sm["fp32_accuracy"]
        assert sm["int8_model_size_mb"] < sm["fp32_model_size_mb"]

        events = payload["metrics"]["events"]
        steps_for_val_acc = [e["step"] for e in events if e["name"] == "val_accuracy"]
        assert steps_for_val_acc == list(range(1, num_epochs + 1))

        params = {p["key"]: p["value"] for p in payload.get("parameters", [])}
        assert params["model_name"] == MODELS[i]["name"]


def test_multi_model_benchmark_no_metric_leakage() -> None:
    """Metrics from model N must not appear in model N+1's run record."""
    sink = _CollectSink()
    writer = Writer(sink=sink, project="compression-engine", stage="benchmark")

    writer.start_run(name="resnet18_run", tags={"model": "resnet18"})
    writer.log_parameter(key="model_name", value="resnet18")
    writer.log_metric(name="resnet18_specific", value=1.0, step=1)
    writer.log_metric(name="train_loss", value=0.5, step=1)
    writer.log_summary_metrics({"resnet18_accuracy": 0.95})
    writer.end_run(status="succeeded")
    ev1 = writer.emit_run_record()

    writer.start_run(name="mobilenetv2_run", tags={"model": "mobilenetv2"})
    writer.log_parameter(key="model_name", value="mobilenetv2")
    writer.log_metric(name="train_loss", value=0.6, step=1)
    writer.log_summary_metrics({"mobilenetv2_accuracy": 0.92})
    writer.end_run(status="succeeded")
    ev2 = writer.emit_run_record()

    p1 = ev1["payload"]
    p2 = ev2["payload"]

    p1_metric_names = {e["name"] for e in p1["metrics"]["events"]}
    p2_metric_names = {e["name"] for e in p2["metrics"]["events"]}
    assert "resnet18_specific" in p1_metric_names
    assert "resnet18_specific" not in p2_metric_names

    p1_params = {p["key"]: p["value"] for p in p1.get("parameters", [])}
    p2_params = {p["key"]: p["value"] for p in p2.get("parameters", [])}
    assert p1_params["model_name"] == "resnet18"
    assert p2_params["model_name"] == "mobilenetv2"

    assert "resnet18_accuracy" in p1.get("summary_metrics", {})
    assert "resnet18_accuracy" not in p2.get("summary_metrics", {})
    assert "mobilenetv2_accuracy" in p2.get("summary_metrics", {})
    assert "mobilenetv2_accuracy" not in p1.get("summary_metrics", {})


def test_multi_model_benchmark_writes_separate_files(tmp_path: Path) -> None:
    """
    Full end-to-end: 3 models through LocalFileSink must produce 3 distinct
    JSONL files, each parseable and containing the correct run data.
    """
    runs_dir = tmp_path / "runs"
    sink = LocalFileSink(base_dir=runs_dir)
    writer = Writer(sink=sink, project="compression-engine", stage="benchmark")

    num_epochs = 100
    run_ids = []

    for model_idx, model_info in enumerate(MODELS):
        model_name = model_info["name"]

        rid = writer.start_run(
            name=f"{model_name}_mnist_ptq",
            tags={"model": model_name, "dataset": "MNIST", "method": "ptq"},
        )
        run_ids.append(rid)

        writer.log_parameter(key="model_name", value=model_name)
        writer.log_parameter(key="learning_rate", value=1e-4)

        epoch_results = _simulate_training(model_idx, num_epochs)
        for epoch_idx, (t_loss, t_acc, v_loss, v_acc, v_f1) in enumerate(epoch_results):
            writer.log_metric(name="train_loss", value=t_loss, step=epoch_idx + 1)
            writer.log_metric(name="val_accuracy", value=v_acc, step=epoch_idx + 1)

        final_val_acc = epoch_results[-1][3]
        summary = _simulate_compression(model_info, final_val_acc)
        writer.log_summary_metrics(summary)
        writer.end_run(status="succeeded")
        writer.emit_run_record()

    jsonl_files = sorted(runs_dir.glob("*.jsonl"))
    assert len(jsonl_files) == 3, (
        f"Expected 3 JSONL files (one per model), got {len(jsonl_files)}: "
        f"{[f.name for f in jsonl_files]}"
    )

    file_stems = {f.stem for f in jsonl_files}
    assert file_stems == set(run_ids), (
        f"JSONL filenames {file_stems} must match run IDs {set(run_ids)}"
    )

    for f in jsonl_files:
        lines = f.read_text().strip().splitlines()
        assert len(lines) >= 1, f"File {f.name} should have at least 1 line"

        last_event = json.loads(lines[-1])
        assert last_event["type"] == "run_record"
        payload = last_event["payload"]
        assert payload["run_id"] == f.stem
        assert payload["status"] == "succeeded"
        assert "fp32_accuracy" in payload.get("summary_metrics", {})
        assert "int8_accuracy" in payload.get("summary_metrics", {})

        params = {p["key"]: p["value"] for p in payload.get("parameters", [])}
        assert "model_name" in params


def test_multi_model_benchmark_mixed_success_failure() -> None:
    """
    If one model fails mid-benchmark, its run should be 'failed' while the
    others succeed. The writer must not be left in a broken state.
    """
    sink = _CollectSink()
    writer = Writer(sink=sink, project="compression-engine", stage="benchmark")

    writer.start_run(name="resnet18_ok", tags={"model": "resnet18"})
    writer.log_metric(name="train_loss", value=0.5, step=1)
    writer.log_summary_metrics({"final_accuracy": 0.95})
    writer.end_run(status="succeeded")
    ev_ok1 = writer.emit_run_record()

    writer.start_run(name="broken_model", tags={"model": "broken"})
    writer.log_metric(name="train_loss", value=2.3, step=1)
    writer.end_run(status="failed")
    ev_fail = writer.emit_run_record()

    writer.start_run(name="mobilenetv2_ok", tags={"model": "mobilenetv2"})
    writer.log_metric(name="train_loss", value=0.4, step=1)
    writer.log_summary_metrics({"final_accuracy": 0.92})
    writer.end_run(status="succeeded")
    ev_ok2 = writer.emit_run_record()

    assert ev_ok1["payload"]["status"] == "succeeded"
    assert ev_fail["payload"]["status"] == "failed"
    assert ev_ok2["payload"]["status"] == "succeeded"

    assert ev_ok2["payload"]["run_id"] != ev_ok1["payload"]["run_id"]
    assert ev_fail["payload"]["run_id"] != ev_ok1["payload"]["run_id"]

    ok2_metric_names = {e["name"] for e in ev_ok2["payload"]["metrics"]["events"]}
    assert "train_loss" in ok2_metric_names
    ok2_params = {p["key"] for p in ev_ok2["payload"].get("parameters", [])}
    fail_metrics = {e["name"] for e in ev_fail["payload"]["metrics"]["events"]}
    assert "final_accuracy" not in ev_fail["payload"].get("summary_metrics", {})
