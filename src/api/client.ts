/// <reference types="../vite-env" />

/**
 * API Client for CEMI (local server or cloud). Supports optional Bearer token for cloud backend.
 * Fallback must match gateway default (see cli/cemi/defaults.py DEFAULT_GATEWAY_PORT).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3141";

/** When the page is served by the local gateway (same origin), use relative URLs so we always hit that gateway. */
function getEffectiveBaseUrl(): string {
  if (typeof window === "undefined") return API_BASE_URL;
  try {
    const origin = window.location.origin;
    const isGateway =
      (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") &&
      window.location.port === "3141";
    if (isGateway) return ""; // same-origin: /api/* goes to the gateway that served this page
  } catch {
    // ignore
  }
  return API_BASE_URL;
}

export interface ApiError {
  detail: string;
}

export type TokenGetter = () => Promise<string | null>;

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private tokenGetter: TokenGetter | null = null;

  constructor(baseUrl: string = API_BASE_URL, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  setTokenGetter(getter: TokenGetter): void {
    this.tokenGetter = getter;
  }

  async getAccessToken(): Promise<string | null> {
    return this.tokenGetter ? this.tokenGetter() : Promise.resolve(null);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const base = getEffectiveBaseUrl();
    const url = base ? `${base}${endpoint}` : endpoint;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.apiKey) {
      (headers as Record<string, string>)["X-API-Key"] = this.apiKey;
    }
    if (this.tokenGetter) {
      const token = await this.tokenGetter();
      if (token) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.detail || "API request failed");
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // Projects
  async getProjects() {
    return this.request<Array<{ id: string; name: string; org_id: string; created_at: string }>>(
      "/api/projects"
    );
  }

  async createProject(name: string) {
    return this.request<{ id: string; name: string; org_id: string; created_at: string }>(
      "/api/projects",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );
  }

  async getProject(projectId: string) {
    return this.request<{ id: string; name: string; org_id: string; created_at: string }>(
      `/api/projects/${projectId}`
    );
  }

  // Runs
  async createRun(projectId: string, data: { name?: string; tags?: Record<string, string> }) {
    return this.request<RunResponse>(
      `/api/projects/${projectId}/runs`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getRuns(projectId: string, filters?: {
    status?: string;
    tag?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.tag) params.append("tag", filters.tag);
    if (filters?.search) params.append("search", filters.search);

    const query = params.toString();
    return this.request<RunResponse[]>(
      `/api/projects/${projectId}/runs${query ? `?${query}` : ""}`
    );
  }

  async getRun(runId: string) {
    return this.request<RunResponse>(`/api/runs/${runId}`);
  }

  // Contract / Decision layer (local gateway MVP)
  async getContract(projectId: string, opts?: { path?: string }) {
    const params = new URLSearchParams();
    if (opts?.path) params.append("path", opts.path);
    const q = params.toString();
    return this.request<{ contract_path: string; contract: unknown }>(
      `/api/projects/${projectId}/contract${q ? `?${q}` : ""}`
    );
  }

  async getRecommendation(projectId: string, opts?: { path?: string }) {
    const params = new URLSearchParams();
    if (opts?.path) params.append("path", opts.path);
    const q = params.toString();
    return this.request<{
      contract_path: string;
      contract: unknown;
      result: unknown;
    }>(`/api/projects/${projectId}/recommendation${q ? `?${q}` : ""}`);
  }

  async updateRun(runId: string, data: { name?: string; status?: string; notes?: string }) {
    return this.request<RunResponse>(
      `/api/runs/${runId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  // Parameters
  async logParams(runId: string, params: Array<{ key: string; value: string | number | boolean }>) {
    return this.request<{ message: string }>(
      `/api/runs/${runId}/params`,
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
  }

  async getParams(runId: string) {
    return this.request<Array<{ key: string; value: string | number | boolean; value_type: string }>>(
      `/api/runs/${runId}/params`
    );
  }

  // Metrics
  async logMetrics(
    runId: string,
    metrics: Array<{ name: string; step: number; timestamp: string; value: number }>
  ) {
    return this.request<{ message: string }>(
      `/api/runs/${runId}/metrics`,
      {
        method: "POST",
        body: JSON.stringify(metrics),
      }
    );
  }

  async getMetrics(
    runId: string,
    filters?: { name?: string; from_step?: number; to_step?: number }
  ) {
    const params = new URLSearchParams();
    if (filters?.name) params.append("name", filters.name);
    if (filters?.from_step !== undefined) params.append("fromStep", filters.from_step.toString());
    if (filters?.to_step !== undefined) params.append("toStep", filters.to_step.toString());

    const query = params.toString();
    return this.request<Array<{ name: string; step: number; timestamp: string; value: number }>>(
      `/api/runs/${runId}/metrics${query ? `?${query}` : ""}`
    );
  }
}

// Types
export interface RunResponse {
  id: string;
  project_id: string;
  name: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  tags: Record<string, string>;
}

// Create default client instance
export const apiClient = new ApiClient();

