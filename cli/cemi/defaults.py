"""Single source of truth for CEMI local defaults (port, URL, directory).

Used by CLI, local gateway, and writer so one place defines default port and
save directory. Frontend fallback should match DEFAULT_GATEWAY_PORT and
default_gateway_base_url().
"""
from __future__ import annotations

DEFAULT_GATEWAY_PORT = 3141
DEFAULT_SAVE_DIR = ".cemi"


def default_gateway_base_url(port: int | None = None) -> str:
    """Return the default gateway base URL (e.g. http://127.0.0.1:3141)."""
    p = port if port is not None else DEFAULT_GATEWAY_PORT
    return f"http://127.0.0.1:{p}"
