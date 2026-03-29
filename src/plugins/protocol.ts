// src/plugins/protocol.ts

import type { PluginRuntimeContext } from "./types";

export type HostToPluginMessage =
  | { type: "HOST_INIT"; payload: { apiVersion: string } }
  | { type: "HOST_CONTEXT"; payload: PluginRuntimeContext }
  | { type: "HOST_EVENT"; payload: { name: string; data: unknown } }
  | { type: "HOST_DISPOSE" };

export type PluginToHostMessage =
  | { type: "PLUGIN_READY"; payload: { pluginId: string; apiVersion: string } }
  | { type: "PLUGIN_LOG"; payload: { level: "debug" | "info" | "warn" | "error"; message: string; meta?: unknown } }
  | { type: "PLUGIN_ERROR"; payload: { message: string; stack?: string } };

// If you want RPC later (plugin asks host for data), add request/response shapes.
// This maps well onto MessageChannel usage.
export type PluginRpcRequest =
  | { id: string; method: "listRuns"; params: { projectId: string } }
  | { id: string; method: "getRun"; params: { runId: string } }
  | { id: string; method: "queryMetricSeries"; params: any }
  | { id: string; method: "listArtifacts"; params: { runId: string } }
  | { id: string; method: "readArtifactJson"; params: { artifactId: string } };

export type PluginRpcResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: { message: string } };



import type { PluginRuntimeContext } from "./types";

export type HostToPluginMessage =
  | { type: "HOST_INIT"; payload: { apiVersion: string } }
  | { type: "HOST_CONTEXT"; payload: PluginRuntimeContext }
  | { type: "HOST_EVENT"; payload: { name: string; data: unknown } }
  | { type: "HOST_DISPOSE" };

export type PluginToHostMessage =
  | { type: "PLUGIN_READY"; payload: { pluginId: string; apiVersion: string } }
  | { type: "PLUGIN_LOG"; payload: { level: "debug" | "info" | "warn" | "error"; message: string; meta?: unknown } }
  | { type: "PLUGIN_ERROR"; payload: { message: string; stack?: string } };

// If you want RPC later (plugin asks host for data), add request/response shapes.
// This maps well onto MessageChannel usage.
export type PluginRpcRequest =
  | { id: string; method: "listRuns"; params: { projectId: string } }
  | { id: string; method: "getRun"; params: { runId: string } }
  | { id: string; method: "queryMetricSeries"; params: any }
  | { id: string; method: "listArtifacts"; params: { runId: string } }
  | { id: string; method: "readArtifactJson"; params: { artifactId: string } };

export type PluginRpcResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: { message: string } };




