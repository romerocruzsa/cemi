#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import venv
from pathlib import Path


def _run(cmd: list[str], *, cwd: Path, env: dict[str, str] | None = None) -> None:
    print(f"+ ({cwd}) {' '.join(cmd)}", flush=True)
    subprocess.check_call(cmd, cwd=str(cwd), env=env)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    cli_root = repo_root / "cli"
    dist_src = repo_root / "dist"
    dist_dst = cli_root / "cemi" / "workspace_dist"

    if not cli_root.is_dir():
        print(f"Error: expected CLI at {cli_root}", file=sys.stderr)
        return 2

    # Build the workspace UI for same-origin API (relative /api/*).
    # `cli/cemi/workspace_dist` is generated release output copied from `dist/`.
    build_env = os.environ.copy()
    build_env["VITE_API_BASE_URL"] = ""
    build_env["VITE_USE_MOCK_DATA"] = "false"
    build_env["VITE_AZURE_CLIENT_ID"] = ""
    build_env["VITE_AZURE_TENANT_ID"] = ""
    build_env["VITE_ALLOWED_EMAIL_DOMAIN"] = ""
    build_env["VITE_HUBSPOT_RSS_URL"] = ""
    build_env["VITE_HUBSPOT_PORTAL_ID"] = ""
    build_env["VITE_HUBSPOT_FORM_GUID"] = ""
    build_env["VITE_HUBSPOT_PARTNER_PORTAL_ID"] = ""
    build_env["VITE_HUBSPOT_PARTNER_FORM_GUID"] = ""

    try:
        _run(["npm", "ci"], cwd=repo_root, env=build_env)
    except Exception:
        _run(["npm", "install"], cwd=repo_root, env=build_env)
    _run(["npm", "run", "build"], cwd=repo_root, env=build_env)

    if not dist_src.is_dir():
        print(f"Error: missing build output directory {dist_src}", file=sys.stderr)
        return 2

    if dist_dst.exists():
        shutil.rmtree(dist_dst)
    dist_dst.mkdir(parents=True, exist_ok=True)
    shutil.copytree(dist_src, dist_dst, dirs_exist_ok=True)

    # Build wheel/sdist for CLI package
    build_py = sys.executable
    try:
        import build  # noqa: F401
    except Exception:
        # Avoid installing into system Python (PEP 668). Use a dedicated build venv.
        build_venv = repo_root / ".venv-cemi-build"
        if not build_venv.is_dir():
            print(f"Creating build venv at {build_venv} ...", flush=True)
            venv.EnvBuilder(with_pip=True).create(str(build_venv))
        build_py = str(build_venv / "bin" / "python")
        print("Installing 'build' into build venv ...", flush=True)
        _run([build_py, "-m", "pip", "install", "-U", "pip", "build"], cwd=repo_root)

    _run([str(build_py), "-m", "build"], cwd=cli_root)
    print(f"Built package artifacts under {cli_root / 'dist'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

