// src/utils/runHelpers.ts

import type { RunRecord } from "../types/domain";

/**
 * True when the metric name indicates per-epoch training/validation metrics,
 * so the UI should label the x-axis "Epoch" instead of "Step".
 */
export function isEpochAxisMetric(metricName: string): boolean {
  const n = (metricName || "").toLowerCase();
  return n.startsWith("train_") || n.startsWith("val_") || n.startsWith("validation_");
}

/**
 * Compute duration from started_at and ended_at in milliseconds
 */
export function getDuration(run: RunRecord): number | null {
  if (!run.started_at) return null;
  const start = new Date(run.started_at).getTime();
  const end = run.ended_at ? new Date(run.ended_at).getTime() : Date.now();
  return end - start;
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
