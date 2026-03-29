// src/utils/cemiRoutes.ts

/**
 * CEMI route helpers (we don't use react-router; navigation is pushState-based).
 *
 * New run-detail route format:
 *   /workspace/runs?runId=<id>&runIdKey=<run-name>
 */

export function buildCemiRunsUrl(params?: {
  runId?: string | null;
  runIdKey?: string | null;
}): string {
  const base = "/workspace/runs";
  const search = new URLSearchParams();

  const runId = params?.runId?.trim();
  if (runId) search.set("runId", runId);

  const runIdKey = params?.runIdKey?.trim();
  if (runIdKey) search.set("runIdKey", runIdKey);

  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseCemiRunsSearch(search: string): {
  runId: string | null;
  runIdKey: string | null;
} {
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return {
    runId: sp.get("runId"),
    runIdKey: sp.get("runIdKey"),
  };
}

export function buildCemiCompareUrl(runIds: string[]): string {
  const filtered = runIds.map((runId) => runId.trim()).filter(Boolean);
  const search = new URLSearchParams();
  if (filtered.length > 0) {
    search.set("runs", filtered.join(","));
  }
  const query = search.toString();
  return query ? `/workspace/compare?${query}` : "/workspace/compare";
}

export function parseCemiCompareSearch(search: string): { runIds: string[] } {
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = sp.get("runs");
  if (!raw) return { runIds: [] };
  return {
    runIds: raw
      .split(",")
      .map((runId) => runId.trim())
      .filter(Boolean),
  };
}

export function buildCemiConsoleUrl(runId?: string | null): string {
  const search = new URLSearchParams();
  const normalizedRunId = runId?.trim();
  if (normalizedRunId) {
    search.set("runId", normalizedRunId);
  }
  const query = search.toString();
  return query ? `/workspace/console?${query}` : "/workspace/console";
}

export function parseCemiConsoleSearch(search: string): { runId: string | null } {
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return {
    runId: sp.get("runId"),
  };
}


