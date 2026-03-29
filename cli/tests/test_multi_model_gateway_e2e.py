#!/usr/bin/env python3
"""
Test: End-to-end multi-model benchmark through local gateway.

Simulates the full flow: Writer -> LocalFileSink + LocalServerSink -> Gateway,
then verifies the gateway API serves all runs with correct data. This is the
integration test that validates the complete pipeline a user would exercise
when running `cemi start -- python benchmark.py`.
"""

import json
import math
import threading
from http.server import HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

import pytest

from cemi.local_server import make_handler
from cemi.writer import create_writer, create_writer_from_env


MODELS = ["resnet18", "mobilenetv2", "vit-tiny"]


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


def _simulate_model_run(
    writer,
    model_name: str,
    model_idx: int,
    num_epochs: int = 100,
    artifact_path: Path | None = None,
):
    """Simulate a full train + compress cycle for one model. Optionally add one artifact (e.g. model.onnx)."""
    rid = writer.start_run(
        name=f"{model_name}_mnist_ptq",
        tags={"model": model_name, "dataset": "MNIST", "method": "ptq"},
    )
    writer.log_parameter(key="model_name", value=model_name)
    writer.log_parameter(key="learning_rate", value=1e-4)
    writer.log_parameter(key="batch_size", value=32)
    writer.log_parameter(key="num_epochs", value=num_epochs)

    for epoch in range(num_epochs):
        progress = (epoch + 1) / num_epochs
        t_loss = 2.3 * math.exp(-2.0 * progress) + 0.03 * model_idx
        v_acc = 0.6 + 0.35 * (1 - math.exp(-3.0 * progress))
        writer.log_metric(name="train_loss", value=t_loss, step=epoch + 1)
        writer.log_metric(name="val_accuracy", value=v_acc, step=epoch + 1)

    writer.emit_run_record()

    if artifact_path is not None and artifact_path.is_file():
        writer.add_local_file_artifact(path=artifact_path, kind="model")

    writer.log_summary_metrics({
        "fp32_accuracy": v_acc,
        "int8_accuracy": v_acc * 0.98,
        "fp32_model_size_mb": 44.6 - model_idx * 10,
        "int8_model_size_mb": 11.2 - model_idx * 2,
    })
    writer.end_run(status="succeeded")
    writer.emit_run_record()

    return rid


def test_multi_model_gateway_e2e(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Full pipeline: 3 models -> Writer -> disk + gateway -> API serves all 3.
    """
    runs_dir = tmp_path / "runs"
    artifacts_dir = tmp_path / "artifacts"
    runs_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    handler_class = make_handler(runs_dir, artifacts_dir, "http://127.0.0.1:0")
    server = HTTPServer(("127.0.0.1", 0), handler_class)
    port = server.server_address[1]
    base = f"http://127.0.0.1:{port}"
    handler_class.base_url = base
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    monkeypatch.setenv("CEMI_SAVE_DIR", str(tmp_path))
    monkeypatch.setenv("CEMI_LOCAL_SERVER_URL", base)

    try:
        writer = create_writer_from_env(
            project="compression-engine", save_dir=str(tmp_path),
        )

        run_ids = []
        for idx, model_name in enumerate(MODELS):
            rid = _simulate_model_run(writer, model_name, idx)
            run_ids.append(rid)

        assert len(set(run_ids)) == 3, f"Expected 3 unique run IDs, got: {run_ids}"

        # Gateway must list all 3 runs
        status, runs = _http_json("GET", f"{base}/api/projects/compression-engine/runs")
        assert status == 200
        assert isinstance(runs, list)
        gateway_run_ids = {r.get("id") for r in runs}
        for rid in run_ids:
            assert rid in gateway_run_ids, (
                f"Run {rid} not found in gateway. Available: {gateway_run_ids}"
            )

        # Each run must have correct metrics and summary
        for rid in run_ids:
            status, run_data = _http_json("GET", f"{base}/api/runs/{rid}")
            assert status == 200
            assert run_data["id"] == rid
            assert run_data["status"] == "succeeded"
            assert "fp32_accuracy" in run_data.get("summary_metrics", {})
            assert "int8_accuracy" in run_data.get("summary_metrics", {})

            status, metrics = _http_json(
                "GET", f"{base}/api/runs/{rid}/metrics?name=val_accuracy",
            )
            assert status == 200
            assert isinstance(metrics, list)
            assert len(metrics) == 100  # 3 epochs
            assert all(m["name"] == "val_accuracy" for m in metrics)

            status, params = _http_json("GET", f"{base}/api/runs/{rid}/params")
            assert status == 200
            assert isinstance(params, list)
            param_keys = {p["key"] for p in params}
            assert "model_name" in param_keys
            assert "learning_rate" in param_keys

        # Disk must also have 3 separate JSONL files
        jsonl_files = list(runs_dir.glob("*.jsonl"))
        assert len(jsonl_files) == 3, (
            f"Expected 3 JSONL files on disk, got {len(jsonl_files)}: "
            f"{[f.name for f in jsonl_files]}"
        )
    finally:
        server.shutdown()
        server.server_close()


def test_gateway_sees_late_arriving_runs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Simulate a scenario where the gateway starts before any runs exist,
    then runs are written. The gateway should pick them up on subsequent
    API calls (it reads from disk on each request).
    """
    runs_dir = tmp_path / "runs"
    artifacts_dir = tmp_path / "artifacts"
    runs_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    handler_class = make_handler(runs_dir, artifacts_dir, "http://127.0.0.1:0")
    server = HTTPServer(("127.0.0.1", 0), handler_class)
    port = server.server_address[1]
    base = f"http://127.0.0.1:{port}"
    handler_class.base_url = base
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    monkeypatch.setenv("CEMI_SAVE_DIR", str(tmp_path))

    try:
        # Initially no runs
        status, runs = _http_json("GET", f"{base}/api/projects/compression-engine/runs")
        assert status == 200
        assert len(runs) == 0

        # Write a run directly to disk
        writer = create_writer_from_env(
            project="compression-engine", save_dir=str(tmp_path),
        )
        rid = _simulate_model_run(writer, "resnet18", 0)

        # Now gateway should see it
        status, runs = _http_json("GET", f"{base}/api/projects/compression-engine/runs")
        assert status == 200
        assert len(runs) == 1
        assert runs[0]["id"] == rid

        # Write a second run
        rid2 = _simulate_model_run(writer, "mobilenetv2", 1)

        status, runs = _http_json("GET", f"{base}/api/projects/compression-engine/runs")
        assert status == 200
        assert len(runs) == 2
        gateway_ids = {r["id"] for r in runs}
        assert rid in gateway_ids
        assert rid2 in gateway_ids
    finally:
        server.shutdown()
        server.server_close()


def test_multi_model_e2e_with_create_writer_log_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Primary API + gateway: create_writer(log_dir=...) with same path as gateway;
    3 models, first run has an artifact; assert all runs and artifact served.
    """
    runs_dir = tmp_path / "runs"
    artifacts_dir = tmp_path / "artifacts"
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
        writer = create_writer(project="compression-engine", log_dir=str(tmp_path))

        artifact_src = tmp_path / "model.onnx"
        artifact_src.write_bytes(b"fake-onnx")

        run_ids = []
        for idx, model_name in enumerate(MODELS):
            rid = _simulate_model_run(
                writer,
                model_name,
                idx,
                artifact_path=artifact_src if idx == 0 else None,
            )
            run_ids.append(rid)

        assert len(set(run_ids)) == 3, f"Expected 3 unique run IDs, got: {run_ids}"

        status, runs = _http_json("GET", f"{base}/api/projects/compression-engine/runs")
        assert status == 200
        assert isinstance(runs, list)
        gateway_run_ids = {r.get("id") for r in runs}
        for rid in run_ids:
            assert rid in gateway_run_ids, (
                f"Run {rid} not found in gateway. Available: {gateway_run_ids}"
            )

        first_run_id = run_ids[0]
        for rid in run_ids:
            status, run_data = _http_json("GET", f"{base}/api/runs/{rid}")
            assert status == 200
            assert run_data["id"] == rid
            assert run_data["status"] == "succeeded"
            assert "fp32_accuracy" in run_data.get("summary_metrics", {})
            assert "int8_accuracy" in run_data.get("summary_metrics", {})

            status, metrics = _http_json(
                "GET", f"{base}/api/runs/{rid}/metrics?name=val_accuracy",
            )
            assert status == 200
            assert isinstance(metrics, list)
            assert len(metrics) == 100
            assert all(m["name"] == "val_accuracy" for m in metrics)

            status, params = _http_json("GET", f"{base}/api/runs/{rid}/params")
            assert status == 200
            assert isinstance(params, list)
            param_keys = {p["key"] for p in params}
            assert "model_name" in param_keys
            assert "learning_rate" in param_keys

            if rid == first_run_id:
                artifacts = run_data.get("artifacts") or []
                assert len(artifacts) == 1
                assert artifacts[0].get("name") == "model.onnx"

        data = _http_bytes(f"{base}/api/runs/{first_run_id}/artifacts/model.onnx")
        assert data == b"fake-onnx"

        jsonl_files = list(runs_dir.glob("*.jsonl"))
        assert len(jsonl_files) == 3, (
            f"Expected 3 JSONL files on disk, got {len(jsonl_files)}: "
            f"{[f.name for f in jsonl_files]}"
        )
    finally:
        server.shutdown()
        server.server_close()
