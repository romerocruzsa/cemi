-- CEMI backend schema: projects, runs, parameters, summary_metrics, artifact metadata.
-- Use with SQLite or Postgres; run_store.py can use this for persistence.

-- Projects (org/tenant scoped)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    org_id TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- Runs (experiment runs)
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    created_at TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    updated_at TEXT NOT NULL,
    notes TEXT,
    method TEXT,
    quantization TEXT,
    baseline_run_id TEXT,
    parent_run_id TEXT,
    run_token_hash TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);

-- Parameters (hyperparams per run)
CREATE TABLE IF NOT EXISTS run_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_text TEXT,
    value_type TEXT,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_parameters_run_id ON run_parameters(run_id);

-- Summary metrics (final aggregates per run)
CREATE TABLE IF NOT EXISTS run_summary_metrics (
    run_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_real REAL,
    value_int INTEGER,
    value_text TEXT,
    PRIMARY KEY (run_id, key),
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

-- Metric points (time-series; optional, can downsample)
CREATE TABLE IF NOT EXISTS run_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    name TEXT NOT NULL,
    step INTEGER,
    value REAL NOT NULL,
    timestamp TEXT,
    unit TEXT,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_metrics_run_name ON run_metrics(run_id, name);

-- Artifact metadata (URIs; files in object storage)
CREATE TABLE IF NOT EXISTS run_artifacts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    uri TEXT NOT NULL,
    media_type TEXT,
    size_bytes INTEGER,
    hash TEXT,
    created_at TEXT,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_artifacts_run_id ON run_artifacts(run_id);

-- Run tokens (for Writer auth; hash only, not plain)
CREATE TABLE IF NOT EXISTS run_tokens (
    run_id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    expires_at TEXT,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);
