// src/plugins/mock-host.ts

import type { PluginHostApi, PluginEventBus, PluginEventMap } from "./types";
import type { RunRecord, MetricQuery, MetricSeries, RunArtifact } from "../types/domain";

export interface MockDataSource {
  runs: RunRecord[];
  metrics: Record<string, MetricSeries[]>;      // keyed by run_id
  artifacts: Record<string, RunArtifact[]>;     // keyed by run_id
  artifactJson: Record<string, unknown>;        // keyed by artifact_id
}

/**
 * Creates an empty mock data source for plugin development.
 * This will be replaced with real API calls when backend is ready.
 */
export function createMockDataSource(): MockDataSource {
  return {
    runs: [],
    metrics: {},
    artifacts: {},
    artifactJson: {},
  };
}

export function createMockHostApi(data: MockDataSource): PluginHostApi {
  return {
    async listRuns(projectId) {
      return data.runs.filter(r => r.project_id === projectId);
    },
    async getRun(runId) {
      return data.runs.find(r => r.id === runId) ?? null;
    },
    async queryMetricSeries(query: MetricQuery) {
      const seriesList = data.metrics[query.run_id] ?? [];
      let series = seriesList.find(s => s.name === query.name);
      
      if (!series) {
        return { run_id: query.run_id, name: query.name, points: [] };
      }

      // Apply filters
      let points = series.points;
      if (query.step_from !== undefined) {
        points = points.filter(p => p.step >= query.step_from!);
      }
      if (query.step_to !== undefined) {
        points = points.filter(p => p.step <= query.step_to!);
      }
      if (query.ts_from) {
        points = points.filter(p => p.ts >= query.ts_from!);
      }
      if (query.ts_to) {
        points = points.filter(p => p.ts <= query.ts_to!);
      }
      if (query.max_points && points.length > query.max_points) {
        // Simple sampling: take evenly spaced points
        const step = Math.floor(points.length / query.max_points);
        points = points.filter((_, i) => i % step === 0).slice(0, query.max_points);
      }

      return {
        ...series,
        points,
      };
    },
    async listArtifacts(runId) {
      return data.artifacts[runId] ?? [];
    },
    async readArtifactJson<T>(artifactId: string) {
      return (data.artifactJson[artifactId] as T) ?? null;
    },
    navigate(path) {
      // host will implement with react-router or window.history
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    log(level, message, meta) {
      // eslint-disable-next-line no-console
      console[level](`[plugin:${level}] ${message}`, meta ?? "");
    },
  };
}

export function createMockEventBus(): PluginEventBus {
  const listeners: Map<keyof PluginEventMap, Set<(payload: any) => void>> = new Map();

  return {
    on<K extends keyof PluginEventMap>(event: K, handler: (payload: PluginEventMap[K]) => void): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
      
      return () => {
        listeners.get(event)?.delete(handler);
      };
    },
    emit<K extends keyof PluginEventMap>(event: K, payload: PluginEventMap[K]): void {
      listeners.get(event)?.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    },
  };
}


import type { PluginHostApi, PluginEventBus, PluginEventMap } from "./types";
import type { RunRecord, MetricQuery, MetricSeries, RunArtifact } from "../types/domain";

export interface MockDataSource {
  runs: RunRecord[];
  metrics: Record<string, MetricSeries[]>;      // keyed by run_id
  artifacts: Record<string, RunArtifact[]>;     // keyed by run_id
  artifactJson: Record<string, unknown>;        // keyed by artifact_id
}

/**
 * Creates an empty mock data source for plugin development.
 * This will be replaced with real API calls when backend is ready.
 */
export function createMockDataSource(): MockDataSource {
  return {
    runs: [],
    metrics: {},
    artifacts: {},
    artifactJson: {},
  };
}

export function createMockHostApi(data: MockDataSource): PluginHostApi {
  return {
    async listRuns(projectId) {
      return data.runs.filter(r => r.project_id === projectId);
    },
    async getRun(runId) {
      return data.runs.find(r => r.id === runId) ?? null;
    },
    async queryMetricSeries(query: MetricQuery) {
      const seriesList = data.metrics[query.run_id] ?? [];
      let series = seriesList.find(s => s.name === query.name);
      
      if (!series) {
        return { run_id: query.run_id, name: query.name, points: [] };
      }

      // Apply filters
      let points = series.points;
      if (query.step_from !== undefined) {
        points = points.filter(p => p.step >= query.step_from!);
      }
      if (query.step_to !== undefined) {
        points = points.filter(p => p.step <= query.step_to!);
      }
      if (query.ts_from) {
        points = points.filter(p => p.ts >= query.ts_from!);
      }
      if (query.ts_to) {
        points = points.filter(p => p.ts <= query.ts_to!);
      }
      if (query.max_points && points.length > query.max_points) {
        // Simple sampling: take evenly spaced points
        const step = Math.floor(points.length / query.max_points);
        points = points.filter((_, i) => i % step === 0).slice(0, query.max_points);
      }

      return {
        ...series,
        points,
      };
    },
    async listArtifacts(runId) {
      return data.artifacts[runId] ?? [];
    },
    async readArtifactJson<T>(artifactId: string) {
      return (data.artifactJson[artifactId] as T) ?? null;
    },
    navigate(path) {
      // host will implement with react-router or window.history
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    log(level, message, meta) {
      // eslint-disable-next-line no-console
      console[level](`[plugin:${level}] ${message}`, meta ?? "");
    },
  };
}

export function createMockEventBus(): PluginEventBus {
  const listeners: Map<keyof PluginEventMap, Set<(payload: any) => void>> = new Map();

  return {
    on<K extends keyof PluginEventMap>(event: K, handler: (payload: PluginEventMap[K]) => void): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
      
      return () => {
        listeners.get(event)?.delete(handler);
      };
    },
    emit<K extends keyof PluginEventMap>(event: K, payload: PluginEventMap[K]): void {
      listeners.get(event)?.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    },
  };
}

