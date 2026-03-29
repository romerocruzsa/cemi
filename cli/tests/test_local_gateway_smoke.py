import json
import threading
from http.server import HTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from cemi.local_server import make_handler
from cemi.writer import create_writer_from_env


def _http_json(method: str, url: str, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=5) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw.decode("utf-8")) if raw else None
    except HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw.decode("utf-8")) if raw else None


def _http_bytes(url: str) -> bytes:
    req = Request(url, method="GET")
    with urlopen(req, timeout=5) as resp:
        return resp.read()


def _start_gateway(tmp_path: Path) -> tuple[HTTPServer, type, str]:
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
    return server, handler_class, base


def test_gateway_accepts_events_lists_runs_and_serves_artifacts(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    server, _, base = _start_gateway(tmp_path)

    monkeypatch.setenv("CEMI_SAVE_DIR", str(tmp_path))
    monkeypatch.setenv("CEMI_LOCAL_SERVER_URL", base)

    try:
        writer = create_writer_from_env(project="demo", save_dir=str(tmp_path))
        run_id = writer.start_run(name="int8_ptq", tags={"variant": "int8_ptq"}, status="running")
        # Log a couple of metrics (time series)
        writer.log_metric(name="train/accuracy", value=0.7, step=1)
        writer.log_metric(name="train/accuracy", value=0.8, step=2)

        # Add an ONNX artifact and emit snapshot
        model_src = tmp_path / "model.onnx"
        model_src.write_bytes(b"onnx-bytes")
        writer.add_local_file_artifact(path=model_src, kind="model")
        writer.emit_run_record()

        # Runs listing
        status, runs = _http_json("GET", f"{base}/api/projects/demo/runs")
        assert status == 200
        assert isinstance(runs, list)
        assert any(r.get("id") == run_id for r in runs)

        # Metrics filtering
        status, metrics = _http_json("GET", f"{base}/api/runs/{run_id}/metrics?name=train/accuracy")
        assert status == 200
        assert isinstance(metrics, list)
        assert all(m.get("name") == "train/accuracy" for m in metrics)

        # Params endpoint exists (may be empty)
        status, params = _http_json("GET", f"{base}/api/runs/{run_id}/params")
        assert status == 200
        assert isinstance(params, list)

        # Artifact bytes served
        data = _http_bytes(f"{base}/api/runs/{run_id}/artifacts/model.onnx")
        assert data == b"onnx-bytes"
    finally:
        server.shutdown()
        server.server_close()


def test_gateway_rejects_invalid_run_ids_and_contract_escape(tmp_path: Path) -> None:
    server, _, base = _start_gateway(tmp_path)

    try:
        status, body = _http_json(
            "POST",
            f"{base}/api/events",
            {
                "type": "run_record",
                "payload": {"run_id": "../escape", "project": "demo"},
            },
        )
        assert status == 400
        assert body == {"detail": "Invalid run id."}

        outside_contract = tmp_path.parent / "outside.json"
        outside_contract.write_text('{"name": "outside"}', encoding="utf-8")
        status, body = _http_json(
            "GET",
            f"{base}/api/projects/demo/contract?path={outside_contract}",
        )
        assert status == 400
        assert body == {"detail": "Contract path must stay within the configured save_dir."}
    finally:
        server.shutdown()
        server.server_close()


def test_gateway_only_allows_local_ui_cors(tmp_path: Path) -> None:
    server, _, base = _start_gateway(tmp_path)

    try:
        evil_req = Request(
            f"{base}/api/health",
            method="OPTIONS",
            headers={
                "Origin": "https://evil.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        with pytest.raises(HTTPError) as excinfo:
            urlopen(evil_req, timeout=5)
        assert excinfo.value.code == 403

        local_req = Request(
            f"{base}/api/health",
            method="OPTIONS",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        with urlopen(local_req, timeout=5) as resp:
            assert resp.status == 204
            assert resp.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    finally:
        server.shutdown()
        server.server_close()

