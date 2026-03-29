# CEMI Backend API

Cloud path API: auth, run lifecycle, ingestion, and live metric streaming.

## Setup

```bash
pip install -r requirements.txt
```

## Run

From repo root (with PYTHONPATH):

```bash
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
```

## Environment

- `CEMI_AAD_TENANT_ID`, `CEMI_AAD_CLIENT_ID`: Azure AD validation for Bearer tokens (optional; if unset, dev mode allows all).
- `CEMI_WORKSPACE_URL`: Frontend base URL for `workspace_url` in run start response (default `http://127.0.0.1:5173`).

## Endpoints

- `POST /runs/start` — Create run (Bearer token). Returns `run_id`, `run_token`, `workspace_url`.
- `GET /api/projects`, `GET /api/projects/{id}/runs`, `GET /api/runs/{id}`, `PATCH /api/runs/{id}` — Browser (Bearer token).
- `POST /runs/{run_id}/events` — Writer ingestion (run token). Body: `run_record` event.
- `GET /stream/runs/{run_id}/metrics` — SSE stream of new metric points (Bearer token).

## Persistence

Default: in-memory store (`backend/store.py`). Schema for DB persistence is in `schema.sql`. To use SQLite/Postgres, implement a store backend that reads/writes these tables and set `store` to it in the app.
