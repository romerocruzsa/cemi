import json
import threading
from http.server import HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

import pytest

from cemi.local_server import make_handler
from cemi.writer import create_writer_from_env


def _http_json(method: str, url: str, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=5) as resp:
        raw = resp.read()
        return resp.status, json.loads(raw.decode("utf-8")) if raw else None


def test_retroactive_mode_reads_existing_jsonl_and_sees_appends(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    save_dir = tmp_path / "cemi-save"
    runs_dir = save_dir / "runs"
    artifacts_dir = save_dir / "artifacts"
    runs_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    # Simulate a job that started without the gateway: it just writes to disk.
    writer = create_writer_from_env(project="demo", save_dir=save_dir)
    run_id = writer.start_run(name="retroactive-demo", tags={"mode": "retroactive"})
    writer.log_metric(name="loss", value=0.5, step=1)
    writer.emit_run_record()

    # Start gateway later, pointed at the same save_dir (use handler factory).
    handler_class = make_handler(runs_dir, artifacts_dir, "http://127.0.0.1:0")
    server = HTTPServer(("127.0.0.1", 0), handler_class)
    port = server.server_address[1]
    base = f"http://127.0.0.1:{port}"
    handler_class.base_url = base
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    try:
        status, runs = _http_json("GET", f"{base}/api/projects/demo/runs")
        assert status == 200
        assert isinstance(runs, list)
        assert any(r.get("id") == run_id for r in runs)

        status, metrics = _http_json("GET", f"{base}/api/runs/{run_id}/metrics?name=loss")
        assert status == 200
        assert isinstance(metrics, list)
        assert len(metrics) == 1

        # Append more metrics to the same JSONL file; subsequent GET should reflect it.
        writer.log_metric(name="loss", value=0.4, step=2)
        writer.emit_run_record()

        status, metrics2 = _http_json("GET", f"{base}/api/runs/{run_id}/metrics?name=loss")
        assert status == 200
        assert isinstance(metrics2, list)
        assert len(metrics2) >= 2
    finally:
        server.shutdown()
        server.server_close()
