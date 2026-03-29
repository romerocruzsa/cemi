"""API routes: projects, runs, run lifecycle (Auth + RunAPI)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth import require_auth
from backend.store import store

router = APIRouter()


# ----- Request/response models -----


class RunsStartBody(BaseModel):
    project: str | None = None
    name: str | None = None


class RunUpdateBody(BaseModel):
    name: str | None = None
    status: str | None = None
    notes: str | None = None


# ----- Run start (CLI: cemi start --mode cloud) -----


@router.post("/runs/start")
async def runs_start(
    body: RunsStartBody,
    _claims: dict[str, Any] = Depends(require_auth),
):
    """Create a run and return run_id, run_token, workspace_url for the Writer and browser."""
    project_id = body.project or store.ensure_default_project()
    store.ensure_default_project()
    run, run_token = store.create_run(
        project_id=project_id,
        name=body.name,
    )
    # Workspace URL: frontend base; plan says /workspace/runs?runId=<id>
    import os
    frontend_base = os.environ.get("CEMI_WORKSPACE_URL", "http://127.0.0.1:5173").rstrip("/")
    workspace_url = f"{frontend_base}/workspace/runs?runId={run.id}"
    return {
        "run_id": run.id,
        "run_token": run_token,
        "workspace_url": workspace_url,
    }


# ----- Projects (browser) -----


@router.get("/api/projects")
async def list_projects(_claims: dict[str, Any] = Depends(require_auth)):
    store.ensure_default_project()
    return list(store.projects.values())


@router.get("/api/projects/{project_id}")
async def get_project(
    project_id: str,
    _claims: dict[str, Any] = Depends(require_auth),
):
    store.ensure_default_project()
    if project_id not in store.projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return store.projects[project_id]


# ----- Runs (browser) -----


@router.get("/api/projects/{project_id}/runs")
async def list_runs(
    project_id: str,
    _claims: dict[str, Any] = Depends(require_auth),
):
    runs = store.list_runs(project_id)
    return [r.to_api() for r in runs]


@router.get("/api/runs/{run_id}")
async def get_run(
    run_id: str,
    _claims: dict[str, Any] = Depends(require_auth),
):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run.to_api()


@router.patch("/api/runs/{run_id}")
async def update_run(
  run_id: str,
  body: RunUpdateBody,
  _claims: dict[str, Any] = Depends(require_auth),
):
    payload = body.model_dump(exclude_none=True)
    run = store.update_run(run_id, payload)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run.to_api()


@router.get("/api/runs/{run_id}/metrics")
async def get_run_metrics(
    run_id: str,
    _claims: dict[str, Any] = Depends(require_auth),
):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run.metrics
