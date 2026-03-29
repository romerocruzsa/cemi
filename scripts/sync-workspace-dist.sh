#!/usr/bin/env bash
# Copy the generated Vite build output into the CLI package so the pip-installed
# cemi serves the latest UI. `cli/cemi/workspace_dist` is release output, not
# source of record; regenerate it from `dist/` after frontend changes.
# Run after: npm run build
# Then: pip install -e ./cli  (or use your venv)

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
WORKSPACE_DIST="${ROOT}/cli/cemi/workspace_dist"

if [[ ! -d "$DIST" ]]; then
  echo "Error: $DIST not found. Run 'npm run build' first." >&2
  exit 1
fi

rm -rf "${WORKSPACE_DIST:?}"/*
cp -r "$DIST/index.html" "$DIST/assets" "$WORKSPACE_DIST/"
echo "Synced dist/ -> cli/cemi/workspace_dist/"
echo "Reinstall the CLI to use the new UI: pip install -e ./cli"
