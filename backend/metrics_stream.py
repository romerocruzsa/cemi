"""MetricsStreamer: in-memory pub/sub for live metric points. SSE endpoint for browser."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from backend.auth import require_auth
from backend.store import store

router = APIRouter()

# run_id -> list of (metric_point, run_record snippet) for new metrics
_run_queues: dict[str, asyncio.Queue[dict[str, Any]]] = defaultdict(lambda: asyncio.Queue(maxsize=1000))


def publish_metrics(run_id: str, run_record_payload: dict[str, Any]) -> None:
    """Called from ingestion when a run_record is received. Push metrics to run's queue."""
    metrics = run_record_payload.get("metrics") or []
    if not metrics:
        return
    q = _run_queues.get(run_id)
    if not q:
        return
    for m in metrics:
        try:
            q.put_nowait({"metric": m, "run_id": run_id})
        except asyncio.QueueFull:
            break


def get_or_create_queue(run_id: str) -> asyncio.Queue[dict[str, Any]]:
    return _run_queues[run_id]


@router.get("/stream/runs/{run_id}/metrics")
async def stream_run_metrics(
    run_id: str,
    request: Request,
    _claims: dict[str, Any] = Depends(require_auth),
):
    """SSE stream of new metric points for a run. Browser subscribes with Bearer token."""
    run = store.get_run(run_id)
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        q = get_or_create_queue(run_id)
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'heartbeat': True})}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )