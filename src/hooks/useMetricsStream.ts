/**
 * Hook to load run metrics and optionally subscribe to live SSE stream.
 * Use when useMockData() is false and backend exposes GET /stream/runs/:runId/metrics.
 */

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { isLocalHostUrl } from "../api/health";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3141";

export interface MetricPoint {
  step: number;
  value: number;
  timestamp?: string;
  name?: string;
}

export function useMetricsStream(
  runId: string | null,
  initialMetrics: MetricPoint[] | undefined,
  options: { enabled?: boolean; pollIntervalMs?: number } = {}
) {
  const { enabled = true, pollIntervalMs = 2000 } = options;
  const [points, setPoints] = useState<MetricPoint[]>(() => initialMetrics || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isLocalApi = !API_BASE.trim() || isLocalHostUrl(API_BASE);

  useEffect(() => {
    if (!runId || !enabled) {
      setPoints(initialMetrics || []);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let interval: number | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromApi = await apiClient.getMetrics(runId);
        const mapped: MetricPoint[] = (fromApi as Array<{ step: number; value: number; timestamp?: string; name?: string }>).map(
          (m) => ({ step: m.step, value: m.value, timestamp: m.timestamp, name: m.name })
        );
        if (initialMetrics && initialMetrics.length > 0 && mapped.length === 0) {
          setPoints(initialMetrics);
        } else if (mapped.length > 0) {
          setPoints(mapped);
        } else {
          setPoints(initialMetrics || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setPoints(initialMetrics || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    if (isLocalApi && pollIntervalMs > 0) {
      interval = window.setInterval(() => {
        load();
      }, pollIntervalMs);
    }
    return () => {
      cancelled = true;
      if (interval != null) window.clearInterval(interval);
    };
  }, [runId, enabled, pollIntervalMs, isLocalApi]);

  // SSE subscription for live metrics (skip for local host; local gateway may not have SSE)
  useEffect(() => {
    if (!runId || !enabled || !API_BASE.trim() || isLocalHostUrl(API_BASE)) return;

    const url = `${API_BASE.replace(/\/$/, "")}/stream/runs/${runId}/metrics`;
    let aborted = false;

    const subscribe = async () => {
      try {
        const token = await apiClient.getAccessToken();
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (!aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.heartbeat) continue;
                const m = data.metric;
                if (m && typeof m.value === "number") {
                  setPoints((prev) => [...prev, { step: m.step ?? prev.length, value: m.value, name: m.name, timestamp: m.timestamp }]);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch {
        // connection closed or error
      }
    };

    subscribe();
    return () => {
      aborted = true;
    };
  }, [runId, enabled]);

  const appendPoint = useCallback((name: string, step: number, value: number, timestamp?: string) => {
    setPoints((prev) => [...prev, { name, step, value, timestamp }]);
  }, []);

  return { points, loading, error, appendPoint };
}
