"""Local CEMI gateway server. Reads run data from a save directory (e.g. .cemi/runs/) and serves the workspace UI; accepts live Writer events via POST /api/events."""

from __future__ import annotations

import json
import os
import threading
import mimetypes
import re
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from importlib import resources as importlib_resources
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from .contract import default_contract_path, evaluate_contract, load_contract
from .decision_layer import build_metric_registry, evaluate_contract_v0
from .defaults import DEFAULT_GATEWAY_PORT, DEFAULT_SAVE_DIR, default_gateway_base_url


def _workspace_dist_root():
    """
    Return a Traversable pointing at cemi/workspace_dist inside the installed package.
    """
    try:
        return importlib_resources.files("cemi").joinpath("workspace_dist")
    except Exception:
        return None


def _read_workspace_dist(rel_path: str) -> tuple[bytes, str] | None:
    """
    Read a file from the embedded workspace dist, returning (bytes, content_type).
    """
    root = _workspace_dist_root()
    if root is None:
        return None
    rel = rel_path.lstrip("/")
    if ".." in Path(rel).parts:
        return None
    node = root.joinpath(rel)
    try:
        if not node.is_file():
            return None
        data = node.read_bytes()
    except Exception:
        return None
    ctype = mimetypes.guess_type(rel)[0] or "application/octet-stream"
    return data, ctype


def _serve_workspace_asset(handler: "CemiLocalHandler", path: str) -> bool:
    """
    Serve an embedded workspace asset.

    Supports both:
      - /assets/<file>
      - /login/assets/<file>
    """
    if path.startswith("/login/assets/"):
        rel = "assets/" + path[len("/login/assets/") :]
    elif path.startswith("/assets/"):
        rel = path.lstrip("/")
    else:
        return False

    maybe = _read_workspace_dist(rel)
    if maybe is None:
        handler.send_response(404)
        handler.end_headers()
        return True
    data, ctype = maybe
    handler._send_bytes(data, status=200, content_type=ctype)
    return True


def _default_runs_dir() -> Path:
    sd = os.environ.get("CEMI_SAVE_DIR")
    base = Path(sd).expanduser() if sd else Path(DEFAULT_SAVE_DIR)
    return base / "runs"


def _default_artifacts_dir() -> Path:
    sd = os.environ.get("CEMI_SAVE_DIR")
    base = Path(sd).expanduser() if sd else Path(DEFAULT_SAVE_DIR)
    return base / "artifacts"


_SAFE_ID_RE = re.compile(r"^[A-Za-z0-9._-]+$")
_DEV_UI_ORIGINS = {
    "http://127.0.0.1:5173",
    "http://localhost:5173",
}


def _is_safe_id(value: str) -> bool:
    return bool(value) and bool(_SAFE_ID_RE.fullmatch(value))


def _resolve_run_path(runs_dir: Path, run_id: str) -> Path | None:
    if not _is_safe_id(run_id):
        return None
    return runs_dir / f"{run_id}.jsonl"


def _resolve_artifact_path(artifacts_dir: Path, run_id: str, artifact_name: str) -> Path | None:
    if not _is_safe_id(run_id):
        return None
    if "/" in artifact_name or "\\" in artifact_name or artifact_name in (".", ".."):
        return None
    return artifacts_dir / run_id / artifact_name


def _resolve_contract_path_for_request(save_dir: Path, requested_path: str | None) -> Path:
    if not requested_path:
        return _default_contract_path().expanduser()

    candidate = Path(requested_path).expanduser()
    if candidate.suffix.lower() != ".json":
        raise ValueError("Contract path must point to a .json file.")

    base = save_dir.resolve()
    resolved = candidate.resolve()
    try:
        resolved.relative_to(base)
    except ValueError as e:
        raise ValueError("Contract path must stay within the configured save_dir.") from e
    return resolved

def _normalize_summary_metrics(sm: Any) -> dict[str, Any]:
    """
    Summary metrics are user-defined.

    For local viewing we pass them through as-is (dict of arbitrary keys).
    """
    return dict(sm) if isinstance(sm, dict) else {}

def _normalize_artifacts(artifacts: Any, *, run_id: str, base_url: str) -> list[dict[str, Any]]:
    if not isinstance(artifacts, list):
        return []
    out: list[dict[str, Any]] = []
    for idx, a in enumerate(artifacts):
        if not isinstance(a, dict):
            continue
        aa = dict(a)
        # Writer uses 'kind'; UI expects 'type'
        if "type" not in aa and isinstance(aa.get("kind"), str):
            aa["type"] = aa.get("kind")
        # Prefer 'uri' but allow 'url'
        if "uri" not in aa and isinstance(aa.get("url"), str):
            aa["uri"] = aa.get("url")
        # Ensure an id exists for UI tables/keys
        if not isinstance(aa.get("id"), str) or not aa.get("id"):
            name = aa.get("name") if isinstance(aa.get("name"), str) else f"artifact-{idx}"
            aa["id"] = f"{run_id}:{name}:{idx}"
        # If uri is a relative path, make it absolute to this gateway so the UI can fetch it.
        uri = aa.get("uri")
        if isinstance(uri, str) and uri.startswith("/"):
            aa["uri"] = base_url.rstrip("/") + uri
        out.append(aa)
    return out

def _normalize_run_for_ui(run: dict[str, Any], *, base_url: str) -> dict[str, Any]:
    out = dict(run)
    run_id = out.get("id") if isinstance(out.get("id"), str) else out.get("run_id")
    rid = run_id if isinstance(run_id, str) else "run"
    out["summary_metrics"] = _normalize_summary_metrics(out.get("summary_metrics"))
    out["artifacts"] = _normalize_artifacts(out.get("artifacts"), run_id=rid, base_url=base_url)
    # Params: UI expects list of {key, value}
    if "params" not in out or not isinstance(out.get("params"), list):
        out["params"] = out.get("parameters") if isinstance(out.get("parameters"), list) else []
    # Tags: UI expects list of {key, value}; Writer may send dict
    raw_tags = out.get("tags")
    if isinstance(raw_tags, dict):
        out["tags"] = [{"key": k, "value": str(v)} for k, v in raw_tags.items()]
    elif not isinstance(raw_tags, list):
        out["tags"] = []
    return out

def _default_contract_path() -> Path:
    p = os.environ.get("CEMI_CONTRACT_PATH")
    if p and p.strip():
        return Path(p).expanduser()
    return default_contract_path()


def _load_run_from_jsonl(path: Path) -> dict[str, Any] | None:
    """
    Load the *latest* run_record payload from a JSONL file.

    Supports:
      - schema v1 payloads (legacy): {id, project_id, metrics: [...], summary_metrics: {...}, ...}
      - model-neutral v2 payloads (plan.md): {run_id, project, stage, created_at_ms, context, metrics:{events,summary}, ...}
    """
    if not path.is_file():
        return None
    last_payload: dict[str, Any] | None = None
    last_schema: str | None = None
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return None
    for line in text.splitlines():
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") != "run_record":
            continue
        payload = event.get("payload") or {}
        if isinstance(payload, dict):
            last_payload = payload
            last_schema = event.get("schema_version") if isinstance(event.get("schema_version"), str) else None

    if not last_payload:
        return None

    # Model-neutral (plan.md) payload
    if "run_id" in last_payload and isinstance(last_payload.get("run_id"), str):
        run_id = last_payload["run_id"]
        project = last_payload.get("project")
        created_ms = last_payload.get("created_at_ms")
        created_at = None
        if isinstance(created_ms, (int, float)) and not isinstance(created_ms, bool):
            # Best-effort ISO string for existing UI bits.
            import datetime as _dt

            created_at = _dt.datetime.fromtimestamp(float(created_ms) / 1000.0, tz=_dt.timezone.utc).isoformat().replace("+00:00", "Z")

        # Build legacy-compatible views
        metrics_obj = last_payload.get("metrics") if isinstance(last_payload.get("metrics"), dict) else {}
        summary_list = metrics_obj.get("summary") if isinstance(metrics_obj.get("summary"), list) else []
        summary_metrics: dict[str, Any] = {}
        for m in summary_list:
            if not isinstance(m, dict):
                continue
            n = m.get("name")
            v = m.get("value")
            if isinstance(n, str) and isinstance(v, (int, float)) and not isinstance(v, bool):
                summary_metrics[n] = float(v)

        out = dict(last_payload)
        out.setdefault("id", run_id)
        out.setdefault("project_id", project if isinstance(project, str) else "default")
        if created_at:
            out.setdefault("created_at", created_at)
        out.setdefault("summary_metrics", summary_metrics)
        # UI expects run.metrics to be an array of points; for v2 payloads, flatten metrics.events.
        events = metrics_obj.get("events") if isinstance(metrics_obj, dict) else None
        if isinstance(events, list):
            out["metrics"] = events
        else:
            out["metrics"] = []
        # Ensure artifacts list exists
        if "artifacts" not in out or not isinstance(out.get("artifacts"), list):
            out["artifacts"] = []
        # Params: Writer emits both "parameters" and "params" (same list of {key, value})
        if "params" not in out or not isinstance(out.get("params"), list):
            out["params"] = out.get("parameters") if isinstance(out.get("parameters"), list) else []
        # Tags: Writer may emit tags as dict; UI expects list of {key, value}
        raw_tags = out.get("tags")
        if isinstance(raw_tags, dict):
            out["tags"] = [{"key": k, "value": str(v)} for k, v in raw_tags.items()]
        elif not isinstance(raw_tags, list):
            out["tags"] = []
        return out

    # Legacy payload (schema v1)
    out = dict(last_payload)
    out.setdefault("params", out.get("parameters") or [])
    out.setdefault("summary_metrics", out.get("summary_metrics") or {})
    raw_tags = out.get("tags")
    if isinstance(raw_tags, dict):
        out["tags"] = [{"key": k, "value": str(v)} for k, v in raw_tags.items()]
    elif not isinstance(out.get("tags"), list):
        out.setdefault("tags", [])
    return out


def _run_project(run: dict[str, Any]) -> str:
    """Extract the project identifier from a loaded run dict, falling back to 'default'."""
    p = run.get("project")
    if isinstance(p, str) and p.strip():
        return p.strip()
    p = run.get("project_id")
    if isinstance(p, str) and p.strip():
        return p.strip()
    return "default"


def _list_runs(runs_dir: Path, project_id: str | None = None, base_url: str | None = None) -> list[dict[str, Any]]:
    """List runs from JSONL files in runs_dir, optionally filtered by project."""
    url = base_url if base_url is not None else default_gateway_base_url()
    runs: list[dict[str, Any]] = []
    if not runs_dir.is_dir():
        return runs
    for path in sorted(runs_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
        run = _load_run_from_jsonl(path)
        if run:
            run["id"] = path.stem
            if project_id is not None and _run_project(run) != project_id:
                continue
            runs.append(_normalize_run_for_ui(run, base_url=url))
    return runs


def _discover_projects(runs_dir: Path) -> list[dict[str, Any]]:
    """Discover unique projects from JSONL run data on disk. Each project gets created_at and updated_at from its runs."""
    seen: dict[str, dict[str, Any]] = {}
    if not runs_dir.is_dir():
        return []
    for path in runs_dir.glob("*.jsonl"):
        run = _load_run_from_jsonl(path)
        if not run:
            continue
        pid = _run_project(run)
        created_at = run.get("created_at") if isinstance(run.get("created_at"), str) else None
        if not created_at:
            try:
                mtime = path.stat().st_mtime
                created_at = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat().replace("+00:00", "Z")
            except Exception:
                created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if pid not in seen:
            seen[pid] = {"id": pid, "name": pid, "created_at": created_at or "", "updated_at": created_at or ""}
        else:
            if created_at:
                if not seen[pid]["created_at"] or created_at < seen[pid]["created_at"]:
                    seen[pid]["created_at"] = created_at
                if created_at > seen[pid]["updated_at"]:
                    seen[pid]["updated_at"] = created_at
    # When runs_dir exists but no projects were discovered from run files, return empty
    # so the UI shows "No projects found. Create your first project to get started."
    if not seen:
        return []
    for p in seen.values():
        if not p.get("created_at"):
            p["created_at"] = p.get("updated_at") or ""
        if not p.get("updated_at"):
            p["updated_at"] = p.get("created_at") or ""
    return sorted(seen.values(), key=lambda p: p["id"])


class CemiLocalHandler(BaseHTTPRequestHandler):
    """HTTP request handler for local CEMI API."""

    runs_dir: Path = _default_runs_dir()
    artifacts_dir: Path = _default_artifacts_dir()
    base_url: str = default_gateway_base_url()

    def _allowed_origin(self) -> str | None:
        origin = self.headers.get("Origin")
        if not origin:
            return None
        parsed_base = urlparse(self.base_url)
        gateway_port = parsed_base.port or DEFAULT_GATEWAY_PORT
        allowed = {
            f"http://127.0.0.1:{gateway_port}",
            f"http://localhost:{gateway_port}",
            *_DEV_UI_ORIGINS,
        }
        return origin if origin in allowed else None

    def _send_origin_headers(self) -> None:
        allowed_origin = self._allowed_origin()
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Vary", "Origin")

    def _send_json(self, data: Any, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._send_origin_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _send_bytes(self, data: bytes, *, status: int = 200, content_type: str = "application/octet-stream") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self._send_origin_headers()
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_error(self, status: int, detail: str, extra: dict[str, Any] | None = None) -> None:
        payload: dict[str, Any] = {"detail": detail}
        if extra:
            payload.update(extra)
        self._send_json(payload, status=status)

    def _send_cors_preflight(self) -> None:
        allowed_origin = self._allowed_origin()
        if self.headers.get("Origin") and not allowed_origin:
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self._send_cors_preflight()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        qs = parse_qs(parsed.query or "")

        # Embedded workspace UI (pip-only mode): served directly from this gateway.
        # - /workspace and /workspace/*: SPA route fallback to index.html
        # - /assets/* and /login/assets/*: static built assets
        if path == "":
            self.send_response(302)
            self.send_header("Location", "/workspace")
            self.end_headers()
            return

        if _serve_workspace_asset(self, path):
            return

        if path == "/workspace" or path.startswith("/workspace/") or path == "/login" or path.startswith("/login/"):
            maybe = _read_workspace_dist("index.html")
            if maybe is None:
                self._send_error(
                    500,
                    "Workspace UI not bundled. Build and package the workspace dist under cemi/workspace_dist/.",
                )
                return
            data, _ = maybe
            self._send_bytes(data, status=200, content_type="text/html; charset=utf-8")
            return

        if path == "/api/projects":
            self._send_json(_discover_projects(self.runs_dir))
            return
        if path.startswith("/api/projects/"):
            parts = [p for p in path.split("/") if p]
            # /api/projects/{projectId} or /api/projects/{projectId}/runs etc.
            if len(parts) >= 3:
                project_id = parts[2]
                if len(parts) == 3:
                    self._send_json({"id": project_id, "name": project_id})
                    return
                if len(parts) >= 4 and parts[3] == "runs":
                    runs = _list_runs(self.runs_dir, project_id=project_id, base_url=self.base_url)
                    self._send_json(runs)
                    return
                if len(parts) >= 4 and parts[3] == "metrics" and len(parts) >= 5 and parts[4] == "registry":
                    runs = _list_runs(self.runs_dir, project_id=project_id, base_url=self.base_url)
                    self._send_json(build_metric_registry(runs=runs))
                    return

        if path.endswith("/contract") and path.startswith("/api/projects/"):
            try:
                contract_path = _resolve_contract_path_for_request(
                    self.runs_dir.parent,
                    qs.get("path", [None])[0],
                )
            except ValueError as e:
                self._send_error(400, str(e))
                return
            try:
                contract = load_contract(contract_path)
            except FileNotFoundError:
                self._send_error(
                    404,
                    "No contract found.",
                    {"contract_path": str(contract_path)},
                )
                return
            except Exception as e:
                self._send_error(
                    400,
                    f"Failed to load contract: {e}",
                    {"contract_path": str(contract_path)},
                )
                return
            self._send_json({"contract_path": str(contract_path), "contract": contract})
            return

        if path.endswith("/recommendation") and path.startswith("/api/projects/"):
            rec_parts = [p for p in path.split("/") if p]
            rec_project_id = rec_parts[2] if len(rec_parts) >= 3 else "default"
            try:
                contract_path = _resolve_contract_path_for_request(
                    self.runs_dir.parent,
                    qs.get("path", [None])[0],
                )
            except ValueError as e:
                self._send_error(400, str(e))
                return
            try:
                contract = load_contract(contract_path)
            except FileNotFoundError:
                self._send_error(
                    404,
                    "No contract found. Create one at .cemi/contract.json (or set CEMI_CONTRACT_PATH).",
                    {"contract_path": str(contract_path)},
                )
                return
            except Exception as e:
                self._send_error(
                    400,
                    f"Failed to load contract: {e}",
                    {"contract_path": str(contract_path)},
                )
                return

            runs = _list_runs(self.runs_dir, project_id=rec_project_id, base_url=self.base_url)
            try:
                # Detect plan.md v0 contract shape vs earlier "gates" contract.
                if "quality" in contract or "performance" in contract or "resources" in contract:
                    result = evaluate_contract_v0(contract=contract, runs=runs)
                else:
                    # Back-compat: evaluate older "gates" contracts, but still return it under a stable key.
                    result = {"legacy": True, "evaluation": evaluate_contract(runs, contract)}
            except Exception as e:
                self._send_error(400, f"Failed to evaluate contract: {e}")
                return

            self._send_json(
                {
                    "contract_path": str(contract_path),
                    "contract": contract,
                    "result": result,
                }
            )
            return
        if path.startswith("/api/runs/"):
            parts = [p for p in path.split("/") if p]
            # /api/runs/{id} or /api/runs/{id}/metrics or /api/runs/{id}/params
            # /api/runs/{id}/artifacts/{name}
            if len(parts) >= 5 and parts[-2] == "artifacts":
                run_id = parts[-3]
                artifact_name = parts[-1]
                artifact_path = _resolve_artifact_path(self.artifacts_dir, run_id, artifact_name)
                if artifact_path is None:
                    self._send_error(400, "Invalid artifact name.")
                    return
                if not artifact_path.is_file():
                    self.send_response(404)
                    self.end_headers()
                    return
                ctype = mimetypes.guess_type(artifact_path.name)[0] or "application/octet-stream"
                try:
                    data = artifact_path.read_bytes()
                except OSError as e:
                    self._send_error(500, f"Failed to read artifact: {e}")
                    return
                self._send_bytes(data, status=200, content_type=ctype)
                return

            is_metrics = len(parts) >= 4 and parts[-1] == "metrics"
            is_params = len(parts) >= 4 and parts[-1] == "params"
            run_id = parts[-2] if (is_metrics or is_params) else parts[-1]
            run_path = _resolve_run_path(self.runs_dir, run_id)
            if run_path is None:
                self._send_error(400, "Invalid run id.")
                return
            run = _load_run_from_jsonl(run_path)
            if not run:
                self.send_response(404)
                self.end_headers()
                return
            run["id"] = run_id
            run = _normalize_run_for_ui(run, base_url=self.base_url)
            if is_params:
                params = run.get("params") or run.get("parameters") or []
                if not isinstance(params, list):
                    params = []
                self._send_json(params)
                return
            if is_metrics:
                metrics = run.get("metrics") or []
                if isinstance(metrics, dict):
                    metrics = metrics.get("events") or []
                if not isinstance(metrics, list):
                    metrics = []

                # Optional filtering for compare page: ?name=foo&fromStep=...&toStep=...
                name = qs.get("name", [None])[0]
                from_step = qs.get("fromStep", [None])[0]
                to_step = qs.get("toStep", [None])[0]
                try:
                    from_step_i = int(from_step) if from_step is not None else None
                except Exception:
                    from_step_i = None
                try:
                    to_step_i = int(to_step) if to_step is not None else None
                except Exception:
                    to_step_i = None

                filtered: list[Any] = []
                for m in metrics:
                    if not isinstance(m, dict):
                        continue
                    if name and m.get("name") != name:
                        continue
                    step = m.get("step")
                    if isinstance(step, (int, float)) and not isinstance(step, bool):
                        s = int(step)
                        if from_step_i is not None and s < from_step_i:
                            continue
                        if to_step_i is not None and s > to_step_i:
                            continue
                    filtered.append(m)
                self._send_json(filtered)
                return
            self._send_json(run)
            return
        if path == "/api/health" or path == "/health":
            save_dir = str(self.runs_dir.parent.resolve())
            try:
                port = int(urlparse(self.base_url).port or DEFAULT_GATEWAY_PORT)
            except (ValueError, TypeError):
                port = DEFAULT_GATEWAY_PORT
            self._send_json({
                "status": "ok",
                "mode": "local",
                "save_dir": save_dir,
                "port": port,
            })
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/api/events":
            self.send_response(404)
            self.end_headers()
            return
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            event = json.loads(body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_response(400)
            self.end_headers()
            return
        if event.get("type") != "run_record":
            self.send_response(400)
            self.end_headers()
            return
        payload = event.get("payload") or {}
        run_id = payload.get("run_id") or payload.get("id") or "local-run"
        if not isinstance(run_id, str):
            self._send_error(400, "Invalid run id.")
            return
        path = _resolve_run_path(self.runs_dir, run_id)
        if path is None:
            self._send_error(400, "Invalid run id.")
            return
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=True) + "\n")
        self._send_json({"ok": True, "run_id": run_id}, status=201)

    def log_message(self, format: str, *args: Any) -> None:
        # Quiet by default; override to customize
        pass


def make_handler(
    runs_dir: Path,
    artifacts_dir: Path,
    base_url: str,
) -> type:
    """Return a handler class bound to the given config (no class-level mutation of CemiLocalHandler)."""
    _runs_dir = runs_dir
    _artifacts_dir = artifacts_dir
    _base_url = base_url

    class Handler(CemiLocalHandler):
        runs_dir = _runs_dir
        artifacts_dir = _artifacts_dir
        base_url = _base_url

    return Handler


def run_local_server(
    port: int | None = None,
    runs_dir: Path | None = None,
    artifacts_dir: Path | None = None,
) -> None:
    """Run the local CEMI API server until interrupted."""
    p = port if port is not None else DEFAULT_GATEWAY_PORT
    rd = runs_dir or _default_runs_dir()
    ad = artifacts_dir or _default_artifacts_dir()
    base = default_gateway_base_url(p)
    handler_class = make_handler(rd, ad, base)
    server = HTTPServer(("127.0.0.1", p), handler_class)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
