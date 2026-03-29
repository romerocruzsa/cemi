// src/plugins/registry.ts

import type { PluginDefinition, PluginActivationContext } from "./types";

// Hardcoded plugin registry for MVP
// Future: Replace with backend API call to /api/plugins

export function getPluginDefinitions(): PluginDefinition[] {
  return [
    {
      manifest: {
        id: "compression-diff",
        name: "Compression Diff",
        version: "1.0.0",
        apiVersion: "1.0.0",
        description: "Compare FP32 vs INT8 compression results",
        surfaces: ["run_detail_tab", "runs_tab"],
        // No entry URL - will use direct mount
      },
      isActive: (ctx: PluginActivationContext) => {
        // Only show if we have runs with different quantization methods
        return true; // Simplified for MVP
      },
      load: async () => {
        const module = await import("./first-party/compression-diff");
        return module.default || module;
      },
    },
  ];
}


import type { PluginDefinition, PluginActivationContext } from "./types";

// Hardcoded plugin registry for MVP
// Future: Replace with backend API call to /api/plugins

export function getPluginDefinitions(): PluginDefinition[] {
  return [
    {
      manifest: {
        id: "compression-diff",
        name: "Compression Diff",
        version: "1.0.0",
        apiVersion: "1.0.0",
        description: "Compare FP32 vs INT8 compression results",
        surfaces: ["run_detail_tab", "runs_tab"],
        // No entry URL - will use direct mount
      },
      isActive: (ctx: PluginActivationContext) => {
        // Only show if we have runs with different quantization methods
        return true; // Simplified for MVP
      },
      load: async () => {
        const module = await import("./first-party/compression-diff");
        return module.default || module;
      },
    },
  ];
}

