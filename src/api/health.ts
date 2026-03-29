/// <reference types="../vite-env" />

export type ApiMode = "local" | "remote" | "unknown";

export interface ApiHealthResponse {
  status: string;
  mode?: "local" | "remote";
  save_dir?: string;
  port?: number;
}

/** Fallback must match gateway default (cli/cemi/defaults.py). */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3141";

/** When served by the local gateway, use relative URL so we always hit that server. */
function getApiBaseForFetch(): string {
  if (typeof window === "undefined") return API_BASE_URL;
  try {
    if (
      (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") &&
      window.location.port === "3141"
    ) {
      return "";
    }
  } catch {
    // ignore
  }
  return API_BASE_URL;
}

/** True if the URL host is localhost or 127.0.0.1 (any port). Use for "is local API" detection. */
export function isLocalHostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function inferModeFromBaseUrl(): ApiMode {
  return isLocalHostUrl(API_BASE_URL) ? "local" : "unknown";
}

export async function getApiHealth(): Promise<{ status: string; mode: ApiMode }> {
  try {
    const base = getApiBaseForFetch();
    const url = base ? `${base}/api/health` : "/api/health";
    const response = await fetch(url);
    if (!response.ok) {
      return { status: `error:${response.status}`, mode: inferModeFromBaseUrl() };
    }

    const json = (await response.json()) as ApiHealthResponse;
    const status = json.status || "ok";

    if (json.mode === "local" || json.mode === "remote") {
      return { status, mode: json.mode };
    }

    return { status, mode: inferModeFromBaseUrl() };
  } catch {
    return { status: "error", mode: inferModeFromBaseUrl() };
  }
}

/** Fetch full health response including save_dir (so the UI can show where data comes from). */
export async function getApiHealthWithSaveDir(): Promise<ApiHealthResponse & { mode: ApiMode }> {
  try {
    const base = getApiBaseForFetch();
    const url = base ? `${base}/api/health` : "/api/health";
    const response = await fetch(url);
    if (!response.ok) {
      return { status: `error:${response.status}`, mode: inferModeFromBaseUrl() };
    }
    const json = (await response.json()) as ApiHealthResponse;
    const mode = json.mode === "local" || json.mode === "remote" ? json.mode : inferModeFromBaseUrl();
    return { ...json, status: json.status || "ok", mode };
  } catch {
    return { status: "error", mode: inferModeFromBaseUrl() };
  }
}

