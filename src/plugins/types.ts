// src/plugins/types.ts

import type { UUID, RunRecord, MetricQuery, MetricSeries, RunArtifact } from "../types/domain";

interface TargetProfile {
  id: string;
  kind: string;
  label?: string;
  capabilities?: Record<string, unknown>;
}

export type PluginApiVersion = "1.0.0";

export type PluginSurface =
  | "overview_widget"
  | "runs_tab"
  | "run_detail_tab"
  | "compare_tab";

// Serializable metadata (can come from backend later)
export interface PluginManifest {
  id: string;                 // unique stable ID
  name: string;               // display name
  version: string;            // plugin version
  apiVersion: PluginApiVersion;

  description?: string;
  icon?: string;              // icon name or URL (optional)

  // where plugin can appear
  surfaces: PluginSurface[];

  // frontend entry (for future remote loading); for now can be unused
  entry?: string;             // URL to ES module (future)
}

// Runtime-only plugin definition (NOT serialized)
export interface PluginDefinition {
  manifest: PluginManifest;

  // Decide visibility given current host context.
  // Keep it cheap: it should not fetch huge data.
  isActive?: (ctx: PluginActivationContext) => boolean;

  // How the host loads the plugin module.
  // In frontend-only MVP, this is a local dynamic import.
  load: () => Promise<PluginModule>;
}

export interface PluginActivationContext {
  projectId: UUID;

  // "Lens" concept: the set of runs currently selected/visible in dashboard + compare
  visibleRunIds: UUID[];

  // optional focused run (run detail)
  selectedRunId?: UUID;

  // global filters
  targetProfile?: TargetProfile;
  timeRange?: { from: string; to: string }; // ISO strings
}

// Host API exposed to plugins.
// Keep async signatures even for mocks (swap in real API later with zero changes).
export interface PluginHostApi {
  // core run access
  listRuns: (projectId: UUID) => Promise<RunRecord[]>;
  getRun: (runId: UUID) => Promise<RunRecord | null>;

  // metrics
  queryMetricSeries: (query: MetricQuery) => Promise<MetricSeries>;

  // artifacts
  listArtifacts: (runId: UUID) => Promise<RunArtifact[]>;
  readArtifactJson: <T = unknown>(artifactId: UUID) => Promise<T | null>;

  // navigation hooks (optional but useful for "keep users inside app")
  navigate: (path: string) => void;

  // logging (optional)
  log: (level: "debug" | "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void;
}

// Eventing: plugins should react to host selection/filter changes.
export interface PluginEventMap {
  "context:changed": PluginActivationContext;
  "runs:visibleChanged": { visibleRunIds: UUID[] };
  "run:selected": { runId: UUID };
}

// Minimal event bus contract (host implements; plugin subscribes)
export interface PluginEventBus {
  on<K extends keyof PluginEventMap>(event: K, handler: (payload: PluginEventMap[K]) => void): () => void;
  emit<K extends keyof PluginEventMap>(event: K, payload: PluginEventMap[K]): void;
}

// Full runtime context passed into plugin mount/render
export interface PluginRuntimeContext extends PluginActivationContext {
  api: PluginHostApi;
  events: PluginEventBus;

  // UI environment hints (optional)
  theme?: "light" | "dark";
  density?: "comfortable" | "compact";
}

// The contract plugin frontend must implement.
// Microfrontend patterns typically use mount/unmount with a container element.
export interface PluginModule {
  // Required: host calls this with a container DOM node.
  // Plugin renders into container and returns optional cleanup.
  mount: (ctx: PluginRuntimeContext, container: HTMLElement) => void | (() => void) | Promise<void | (() => void)>;

  // Optional: expose metadata for debugging
  getInfo?: () => { name?: string; version?: string };
}

// Serializable metadata (can come from backend later)
export interface PluginManifest {
  id: string;                 // unique stable ID
  name: string;               // display name
  version: string;            // plugin version
  apiVersion: PluginApiVersion;

  description?: string;
  icon?: string;              // icon name or URL (optional)

  // where plugin can appear
  surfaces: PluginSurface[];

  // frontend entry (for future remote loading); for now can be unused
  entry?: string;             // URL to ES module (future)
}

// Runtime-only plugin definition (NOT serialized)
export interface PluginDefinition {
  manifest: PluginManifest;

  // Decide visibility given current host context.
  // Keep it cheap: it should not fetch huge data.
  isActive?: (ctx: PluginActivationContext) => boolean;

  // How the host loads the plugin module.
  // In frontend-only MVP, this is a local dynamic import.
  load: () => Promise<PluginModule>;
}

export interface PluginActivationContext {
  projectId: UUID;

  // "Lens" concept: the set of runs currently selected/visible in dashboard + compare
  visibleRunIds: UUID[];

  // optional focused run (run detail)
  selectedRunId?: UUID;

  // global filters
  targetProfile?: TargetProfile;
  timeRange?: { from: string; to: string }; // ISO strings
}

// Host API exposed to plugins.
// Keep async signatures even for mocks (swap in real API later with zero changes).
export interface PluginHostApi {
  // core run access
  listRuns: (projectId: UUID) => Promise<RunRecord[]>;
  getRun: (runId: UUID) => Promise<RunRecord | null>;

  // metrics
  queryMetricSeries: (query: MetricQuery) => Promise<MetricSeries>;

  // artifacts
  listArtifacts: (runId: UUID) => Promise<RunArtifact[]>;
  readArtifactJson: <T = unknown>(artifactId: UUID) => Promise<T | null>;

  // navigation hooks (optional but useful for "keep users inside app")
  navigate: (path: string) => void;

  // logging (optional)
  log: (level: "debug" | "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void;
}

// Eventing: plugins should react to host selection/filter changes.
export interface PluginEventMap {
  "context:changed": PluginActivationContext;
  "runs:visibleChanged": { visibleRunIds: UUID[] };
  "run:selected": { runId: UUID };
}

// Minimal event bus contract (host implements; plugin subscribes)
export interface PluginEventBus {
  on<K extends keyof PluginEventMap>(event: K, handler: (payload: PluginEventMap[K]) => void): () => void;
  emit<K extends keyof PluginEventMap>(event: K, payload: PluginEventMap[K]): void;
}

// Full runtime context passed into plugin mount/render
export interface PluginRuntimeContext extends PluginActivationContext {
  api: PluginHostApi;
  events: PluginEventBus;

  // UI environment hints (optional)
  theme?: "light" | "dark";
  density?: "comfortable" | "compact";
}

// The contract plugin frontend must implement.
// Microfrontend patterns typically use mount/unmount with a container element.
export interface PluginModule {
  // Required: host calls this with a container DOM node.
  // Plugin renders into container and returns optional cleanup.
  mount: (ctx: PluginRuntimeContext, container: HTMLElement) => void | (() => void) | Promise<void | (() => void)>;

  // Optional: expose metadata for debugging
  getInfo?: () => { name?: string; version?: string };
}




