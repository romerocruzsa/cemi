"""Ingestion API: accept run_record events from Writer (run token auth)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.metrics_stream import publish_metrics
from backend.store import store

router = APIRouter()


def _get_run_token(request: Request) -> str:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header (run token required)",
        )
    return auth[7:].strip()


async def get_run_token(request: Request) -> str:
    return _get_run_token(request)


@router.post("/runs/{run_id}/events")
async def post_run_events(
    run_id: str,
    request: Request,
    token: str = Depends(get_run_token),
):
    """Accept a run_record event from the Writer (CloudSink). Auth: Bearer run_token."""
    if not store.validate_run_token(run_id, token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired run token",
        )
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if body.get("type") != "run_record":
        raise HTTPException(status_code=400, detail="Expected type: run_record")
    payload = body.get("payload")
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    run = store.apply_run_record_payload(run_id, payload)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    publish_metrics(run_id, payload)
    return {"ok": True, "run_id": run_id}
