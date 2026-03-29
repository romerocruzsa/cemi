"""CEMI backend API client for CLI.

Retained for future cloud work, but not surfaced in the closed-beta CLI.
"""

from __future__ import annotations

from typing import Any

import requests


def start_run(
    api_base: str,
    access_token: str,
    project: str | None,
    name: str | None,
) -> dict:
    url = f"{api_base.rstrip('/')}/runs/start"
    payload = {"project": project, "name": name}
    r = requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def send_run_record(
    api_base: str,
    run_id: str,
    run_token: str,
    record: dict[str, Any],
) -> dict:
    """Send a run_record event to the ingestion API (future cloud path)."""
    url = f"{api_base.rstrip('/')}/runs/{run_id}/events"
    r = requests.post(
        url,
        json=record,
        headers={
            "Authorization": f"Bearer {run_token}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json() if r.text else {}
