#!/usr/bin/env python3
"""
Test: Single model train + eval loop with CEMI writer.

Simulates a user training one model on a dataset, logging per-epoch metrics
during training and validation, then logging final summary metrics.
Modeled after a real ViT-on-MNIST workflow.
"""

import json
import math
import threading
from http.server import HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

import pytest

from cemi.local_server import make_handler
from cemi.writer import Writer, LocalFileSink, create_writer


class _CollectSink:
    def __init__(self) -> None:
        self.records: list[dict] = []

    def write(self, record: dict) -> None:
        self.records.append(record)


def _fake_train_epoch(epoch: int, num_epochs: int):
    """Simulate one training epoch returning (loss, accuracy, f1)."""
    progress = (epoch + 1) / num_epochs
    loss = 2.3 * math.exp(-2.0 * progress) + 0.05
    accuracy = 0.1 + 0.85 * (1 - math.exp(-3.0 * progress))
    f1 = accuracy * 0.98
    return loss, accuracy, f1


def _fake_val_epoch(epoch: int, num_epochs: int):
    """Simulate one validation epoch returning (loss, accuracy, f1)."""
    progress = (epoch + 1) / num_epochs
    loss = 2.3 * math.exp(-1.8 * progress) + 0.08
    accuracy = 0.1 + 0.82 * (1 - math.exp(-2.5 * progress))
    f1 = accuracy * 0.97
    return loss, accuracy, f1


def _http_json(method: str, url: str, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=5) as resp:
        raw = resp.read()
        return resp.status, json.loads(raw.decode("utf-8")) if raw else None


def _http_bytes(url: str) -> bytes:
    req = Request(url, method="GET")
    with urlopen(req, timeout=5) as resp:
        return resp.read()


def test_single_model_logs_epoch_metrics() -> None:
    """A single train+eval run must log per-epoch metrics and summary."""
    sink = _CollectSink()
    writer = Writer(sink=sink, project="mnist-bench", stage="train")

    num_epochs = 100
    learning_rate = 1e-4
    batch_size = 32

    run_id = writer.start_run(
        name="vit-tiny_mnist",
        tags={"model": "vit-tiny", "dataset": "MNIST"},
    )
    writer.log_parameter(key="learning_rate", value=learning_rate)
    writer.log_parameter(key="batch_size", value=batch_size)
    writer.log_parameter(key="num_epochs", value=num_epochs)
    writer.log_parameter(key="device", value="cpu")

    for epoch in range(num_epochs):
        train_loss, train_acc, train_f1 = _fake_train_epoch(epoch, num_epochs)
        val_loss, val_acc, val_f1 = _fake_val_epoch(epoch, num_epochs)

        writer.log_metric(name="train_loss", value=train_loss, step=epoch + 1)
        writer.log_metric(name="train_accuracy", value=train_acc, step=epoch + 1)
        writer.log_metric(name="train_f1", value=train_f1, step=epoch + 1)
        writer.log_metric(name="val_loss", value=val_loss, step=epoch + 1)
        writer.log_metric(name="val_accuracy", value=val_acc, step=epoch + 1)
        writer.log_metric(name="val_f1", value=val_f1, step=epoch + 1)

    writer.emit_run_record()

    writer.log_summary_metrics({
        "final_val_accuracy": val_acc,
        "final_val_f1": val_f1,
        "final_val_loss": val_loss,
        "model_size_mb": 1.2,
    })
    writer.end_run(status="succeeded")
    final_event = writer.emit_run_record()

    payload = final_event["payload"]
    assert payload["run_id"] == run_id
    assert payload["status"] == "succeeded"

    params = {p["key"]: p["value"] for p in payload.get("parameters", [])}
    assert params["learning_rate"] == learning_rate
    assert params["batch_size"] == batch_size
    assert params["num_epochs"] == num_epochs

    events = payload["metrics"]["events"]
    metric_names = {e["name"] for e in events}
    assert {"train_loss", "train_accuracy", "train_f1",
            "val_loss", "val_accuracy", "val_f1"} == metric_names

    train_loss_steps = sorted(
        [e for e in events if e["name"] == "train_loss"],
        key=lambda e: e["step"],
    )
    assert len(train_loss_steps) == num_epochs
    assert train_loss_steps[0]["step"] == 1
    assert train_loss_steps[-1]["step"] == num_epochs
    assert train_loss_steps[0]["value"] > train_loss_steps[-1]["value"]

    sm = payload.get("summary_metrics", {})
    assert "final_val_accuracy" in sm
    assert "model_size_mb" in sm
    assert sm["model_size_mb"] == 1.2


def test_single_model_writes_jsonl(tmp_path: Path) -> None:
    """Single model run via LocalFileSink must produce exactly 1 JSONL file."""
    runs_dir = tmp_path / "runs"
    sink = LocalFileSink(base_dir=runs_dir)
    writer = Writer(sink=sink, project="mnist-bench", stage="train")

    num_epochs = 3

    run_id = writer.start_run(
        name="resnet18_mnist",
        tags={"model": "resnet18", "dataset": "MNIST"},
    )
    writer.log_parameter(key="learning_rate", value=1e-4)

    for epoch in range(num_epochs):
        t_loss, t_acc, t_f1 = _fake_train_epoch(epoch, num_epochs)
        v_loss, v_acc, v_f1 = _fake_val_epoch(epoch, num_epochs)
        writer.log_metric(name="train_loss", value=t_loss, step=epoch + 1)
        writer.log_metric(name="val_accuracy", value=v_acc, step=epoch + 1)

    writer.log_summary_metrics({"final_val_accuracy": v_acc})
    writer.end_run(status="succeeded")
    writer.emit_run_record()

    jsonl_files = list(runs_dir.glob("*.jsonl"))
    assert len(jsonl_files) == 1
    assert jsonl_files[0].stem == run_id

    lines = jsonl_files[0].read_text().strip().splitlines()
    last_event = json.loads(lines[-1])
    assert last_event["type"] == "run_record"
    assert last_event["payload"]["status"] == "succeeded"
    assert last_event["payload"]["summary_metrics"]["final_val_accuracy"] == v_acc


def test_single_model_intermediate_emit_preserves_partial_metrics() -> None:
    """Emitting mid-training should capture metrics logged so far."""
    sink = _CollectSink()
    writer = Writer(sink=sink, project="mnist-bench", stage="train")

    writer.start_run(name="mobilenetv2_mnist", tags={"model": "mobilenetv2"})
    writer.log_parameter(key="learning_rate", value=1e-4)

    writer.log_metric(name="train_loss", value=2.1, step=1)
    writer.log_metric(name="val_accuracy", value=0.15, step=1)

    mid_event = writer.emit_run_record()
    mid_events = mid_event["payload"]["metrics"]["events"]
    assert len(mid_events) == 2

    writer.log_metric(name="train_loss", value=1.5, step=2)
    writer.log_metric(name="val_accuracy", value=0.45, step=2)
    writer.log_metric(name="train_loss", value=0.9, step=3)
    writer.log_metric(name="val_accuracy", value=0.72, step=3)

    writer.log_summary_metrics({"final_val_accuracy": 0.72})
    writer.end_run(status="succeeded")
    final_event = writer.emit_run_record()

    final_events = final_event["payload"]["metrics"]["events"]
    assert len(final_events) == 6
    assert final_event["payload"]["status"] == "succeeded"


def test_single_model_failed_run_records_status() -> None:
    """If training fails, the run should record status='failed'."""
    sink = _CollectSink()
    writer = Writer(sink=sink, project="mnist-bench", stage="train")

    writer.start_run(name="broken_model", tags={"model": "broken"})
    writer.log_parameter(key="learning_rate", value=1e-4)
    writer.log_metric(name="train_loss", value=2.3, step=1)

    writer.end_run(status="failed")
    event = writer.emit_run_record()

    assert event["payload"]["status"] == "failed"
    events = event["payload"]["metrics"]["events"]
    assert len(events) == 1


def test_single_model_e2e_create_writer_and_gateway(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Primary API + gateway: create_writer(log_dir), one train/eval run, artifact;
    assert run visible via API and artifact served.
    """
    save_dir = tmp_path
    runs_dir = save_dir / "runs"
    artifacts_dir = save_dir / "artifacts"
    runs_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    handler_class = make_handler(runs_dir, artifacts_dir, "http://127.0.0.1:0")
    server = HTTPServer(("127.0.0.1", 0), handler_class)
    port = server.server_address[1]
    base = f"http://127.0.0.1:{port}"
    handler_class.base_url = base
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    monkeypatch.setenv("CEMI_LOCAL_SERVER_URL", base)

    try:
        writer = create_writer(project="mnist-bench", log_dir=str(save_dir))

        num_epochs = 3
        run_id = writer.start_run(
            name="vit-tiny_mnist",
            tags={"model": "vit-tiny", "dataset": "MNIST"},
        )
        writer.log_parameter(key="learning_rate", value=1e-4)
        writer.log_parameter(key="batch_size", value=32)
        writer.log_parameter(key="num_epochs", value=num_epochs)

        for epoch in range(num_epochs):
            train_loss, train_acc, train_f1 = _fake_train_epoch(epoch, num_epochs)
            val_loss, val_acc, val_f1 = _fake_val_epoch(epoch, num_epochs)
            writer.log_metric(name="train_loss", value=train_loss, step=epoch + 1)
            writer.log_metric(name="val_accuracy", value=val_acc, step=epoch + 1)

        writer.emit_run_record()

        artifact_src = save_dir / "model.onnx"
        artifact_src.write_bytes(b"fake-onnx-bytes")
        writer.add_local_file_artifact(path=artifact_src, kind="model")

        writer.log_summary_metrics({
            "final_val_accuracy": val_acc,
            "model_size_mb": 1.2,
        })
        writer.end_run(status="succeeded")
        writer.emit_run_record()

        status, runs = _http_json("GET", f"{base}/api/projects/mnist-bench/runs")
        assert status == 200
        assert isinstance(runs, list)
        assert len(runs) == 1
        assert runs[0].get("id") == run_id

        status, run_data = _http_json("GET", f"{base}/api/runs/{run_id}")
        assert status == 200
        assert run_data["id"] == run_id
        assert run_data["status"] == "succeeded"
        assert "final_val_accuracy" in run_data.get("summary_metrics", {})
        assert run_data["summary_metrics"]["model_size_mb"] == 1.2

        status, metrics = _http_json("GET", f"{base}/api/runs/{run_id}/metrics?name=val_accuracy")
        assert status == 200
        assert isinstance(metrics, list)
        assert len(metrics) == num_epochs
        assert all(m.get("name") == "val_accuracy" for m in metrics)

        artifacts = run_data.get("artifacts") or []
        assert len(artifacts) == 1
        assert artifacts[0].get("name") == "model.onnx"

        data = _http_bytes(f"{base}/api/runs/{run_id}/artifacts/model.onnx")
        assert data == b"fake-onnx-bytes"
    finally:
        server.shutdown()
        server.server_close()
