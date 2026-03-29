import os
from pathlib import Path

import pytest

from cemi.writer import Writer


class _CollectSink:
    def __init__(self) -> None:
        self.records = []

    def write(self, record):
        self.records.append(record)


def test_writer_emits_user_defined_summary_metrics(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    sink = _CollectSink()
    w = Writer(sink=sink, project="demo", stage="train")
    run_id = w.start_run(name="baseline", tags={"variant": "baseline"})

    # Users define their own keys; UI should render these dynamically.
    w.log_summary_metrics(
        {
            "accuracy": 0.76,
            "loss": 0.42,
            "energy_j": 12.5,
        }
    )
    w.log_mlperf_summary(latency_p90_ms=12.3, latency_p99_ms=18.9, throughput_ips=250.0)
    ev = w.emit_run_record()

    assert ev["type"] == "run_record"
    payload = ev["payload"]
    assert payload["run_id"] == run_id
    assert payload["summary_metrics"]["accuracy"] == 0.76
    assert payload["summary_metrics"]["loss"] == 0.42
    assert payload["summary_metrics"]["energy_j"] == 12.5
    assert payload["summary_metrics"]["latency_p90_ms"] == 12.3
    assert payload["summary_metrics"]["latency_p99_ms"] == 18.9
    assert payload["summary_metrics"]["throughput_ips"] == 250.0


def test_writer_local_file_artifact_copies_and_registers(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    artifacts_dir = tmp_path / "artifacts"

    src = tmp_path / "model.onnx"
    src.write_bytes(b"onnx-bytes")

    sink = _CollectSink()
    w = Writer(sink=sink, project="vision", save_dir=tmp_path)
    run_id = w.start_run(name="int8_ptq", tags={"variant": "int8_ptq"})
    a = w.add_local_file_artifact(path=src, kind="model")

    copied = artifacts_dir / run_id / "model.onnx"
    assert copied.is_file()
    assert copied.read_bytes() == b"onnx-bytes"

    assert a["type"] == "model"
    assert a["media_type"] == "application/octet-stream"
    assert a["uri"].endswith(f"/api/runs/{run_id}/artifacts/model.onnx")
    assert isinstance(a.get("id"), str) and a["id"]


def test_writer_context_namespaces_populate_context_and_parameters() -> None:
    sink = _CollectSink()
    w = Writer(sink=sink, project="edge-ai", stage="benchmark")
    w.start_run(name="board-a-int8")

    w.case.set(
        suite="MLPerf Tiny",
        task="Image Classification",
        scenario="Single Stream",
        dataset="person-detection-v1",
    )
    w.policy.set(
        name="Latency",
        objective_metric="latency_p95_ms",
        objective_direction="lower_is_better",
    )
    w.device.set(
        board="STM32 Board A",
        runtime="CMSIS-NN",
        memory_budget="Flash <= 1 MB; RAM <= 256 KB",
    )

    payload = w.emit_run_record()["payload"]
    assert payload["context"]["case"]["suite"] == "MLPerf Tiny"
    assert payload["context"]["policy"]["name"] == "Latency"
    assert payload["context"]["device"]["board"] == "STM32 Board A"

    params = {entry["key"]: entry["value"] for entry in payload["parameters"]}
    assert params["case.dataset"] == "person-detection-v1"
    assert params["policy.objective_metric"] == "latency_p95_ms"
    assert params["device.memory_budget"] == "Flash <= 1 MB; RAM <= 256 KB"


def test_writer_context_namespaces_set_before_start_run_are_preserved() -> None:
    sink = _CollectSink()
    w = Writer(sink=sink, project="edge-ai", stage="benchmark")

    w.case.set(suite="MLPerf Tiny", task="Keyword Spotting")
    w.device.set(board="Board A", runtime="CMSIS-NN", flash_budget=1_048_576, ram_budget=262_144)
    w.set_policy(name="Memory", objective_metric="peak_memory_bytes")

    w.start_run(name="preconfigured")
    payload = w.emit_run_record()["payload"]

    assert payload["context"]["case"]["task"] == "Keyword Spotting"
    assert payload["context"]["device"]["flash_budget"] == 1_048_576
    assert payload["context"]["policy"]["objective_metric"] == "peak_memory_bytes"

    params = {entry["key"]: entry["value"] for entry in payload["parameters"]}
    assert params["case.suite"] == "MLPerf Tiny"
    assert params["device.ram_budget"] == 262_144
    assert params["policy.name"] == "Memory"


def test_writer_emits_explicit_action_events() -> None:
    sink = _CollectSink()
    w = Writer(sink=sink, project="demo", stage="train")
    run_id = w.start_run(name="baseline")

    w.set_notes("tracking action events")
    w.log_parameter(key="batch_size", value=32)
    w.log_metric(name="train_loss", value=0.5, step=1)
    w.update_status("running")
    payload = w.emit_run_record()["payload"]

    action_events = payload["action_events"]
    assert len(action_events) >= 5

    action_names = [event["action"] for event in action_events]
    assert action_names[:5] == [
        "start_run",
        "set_notes",
        "log_parameter",
        "log_metric",
        "update_status",
    ]

    latest_emit = action_events[-1]
    assert latest_emit["action"] == "emit_run_record"
    assert latest_emit["run_id"] == run_id
    assert latest_emit["run_name"] == "baseline"

