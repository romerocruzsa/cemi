"""CEMI CLI configuration from environment.

The closed-beta CLI is local-only. This module still retains cloud-related
config parsing for future use, but those paths are not surfaced in the beta UX.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_dotenv() -> None:
    """Load .env from current directory or repo root so VITE_* / CEMI_* are set."""
    try:
        from pathlib import Path as P
        for d in (P.cwd(), P.cwd().parent):
            env_file = d / ".env"
            if env_file.is_file():
                with open(env_file) as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, _, v = line.partition("=")
                            k, v = k.strip(), v.strip()
                            if k and v and k not in os.environ:
                                os.environ[k] = v
                return
    except Exception:
        pass


@dataclass(frozen=True)
class CemiConfig:
    client_id: str
    authority: str
    scopes: list[str]
    api_base: str
    cache_path: Path


def load_config() -> CemiConfig:
    _load_dotenv()

    # Prefer CEMI_*; fall back to Vite/frontend env vars so one .env works for both
    client_id = os.environ.get("CEMI_AAD_CLIENT_ID") or os.environ.get("VITE_AZURE_CLIENT_ID")
    tenant_id = os.environ.get("CEMI_AAD_TENANT_ID") or os.environ.get("VITE_AZURE_TENANT_ID")
    if not client_id:
        raise RuntimeError("Set CEMI_AAD_CLIENT_ID or VITE_AZURE_CLIENT_ID.")
    if not tenant_id:
        raise RuntimeError("Set CEMI_AAD_TENANT_ID or VITE_AZURE_TENANT_ID.")

    authority = f"https://login.microsoftonline.com/{tenant_id}"

    scopes_str = os.environ.get("CEMI_AAD_SCOPES", "").strip()
    scopes = [s for s in scopes_str.split() if s]
    if not scopes:
        # Default: same app as frontend; backend may require CEMI_AAD_SCOPES later
        scopes = [f"{client_id}/.default"]

    api_base = os.environ.get("CEMI_API_BASE", "http://127.0.0.1:8000/api")

    cache_dir = Path.home() / ".cemi"
    cache_dir.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(cache_dir, 0o700)
    except OSError:
        pass
    cache_path = cache_dir / "msal_cache.bin"

    return CemiConfig(
        client_id=client_id,
        authority=authority,
        scopes=scopes,
        api_base=api_base,
        cache_path=cache_path,
    )
