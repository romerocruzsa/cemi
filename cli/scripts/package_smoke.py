#!/usr/bin/env python3
from __future__ import annotations

import os
import socket
import subprocess
import sys
import tempfile
import time
import venv
from pathlib import Path
from urllib.request import urlopen


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _venv_bin(venv_dir: Path, name: str) -> Path:
    return venv_dir / "bin" / name


def _pick_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _http_get(url: str, timeout_s: float = 2.0) -> tuple[int, bytes]:
    with urlopen(url, timeout=timeout_s) as resp:
        return int(resp.status), resp.read()


def main() -> int:
    repo_root = _repo_root()
    cli_root = repo_root / "cli"

    # Build wheel (also builds + copies embedded workspace UI).
    build_script = repo_root / "scripts" / "build_cli_package.py"
    subprocess.check_call([sys.executable, str(build_script)], cwd=str(repo_root))

    wheels = sorted((cli_root / "dist").glob("cemi-*.whl"))
    if not wheels:
        print("Error: no wheel found under cli/dist/", file=sys.stderr)
        return 2
    wheel = wheels[-1]

    with tempfile.TemporaryDirectory(prefix="cemi-smoke-") as td:
        td_path = Path(td)
        venv_dir = td_path / ".venv"
        venv.EnvBuilder(with_pip=True).create(str(venv_dir))

        py = _venv_bin(venv_dir, "python")
        cemi = _venv_bin(venv_dir, "cemi")
        subprocess.check_call([str(py), "-m", "pip", "install", str(wheel)])

        save_dir = td_path / "save"
        save_dir.mkdir(parents=True, exist_ok=True)

        port = _pick_free_port()
        env = os.environ.copy()
        env["CEMI_LOCAL_SERVER_URL"] = f"http://127.0.0.1:{port}"

        proc = subprocess.Popen(
            [str(cemi), "gateway", "--port", str(port), "--save-dir", str(save_dir)],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            base = f"http://127.0.0.1:{port}"
            deadline = time.time() + 10.0
            ok = False
            while time.time() < deadline:
                try:
                    status, _ = _http_get(f"{base}/api/health")
                    if status == 200:
                        ok = True
                        break
                except Exception:
                    time.sleep(0.2)
            if not ok:
                print("Error: gateway did not become healthy", file=sys.stderr)
                return 3

            status, html = _http_get(f"{base}/workspace")
            if status != 200:
                print(f"Error: /workspace returned {status}", file=sys.stderr)
                return 4
            if b"<html" not in html.lower():
                print("Error: /workspace did not look like HTML", file=sys.stderr)
                return 5
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
        print("OK: wheel install + gateway /api/health + /workspace", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

