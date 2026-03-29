// src/plugins/PluginHost.tsx

import React, { useEffect, useRef, useState } from "react";
import type { PluginDefinition, PluginRuntimeContext } from "./types";
import { PluginFrame } from "./PluginFrame";
import { createMockHostApi, createMockEventBus, createMockDataSource } from "./mock-host";

interface PluginHostProps {
  plugin: PluginDefinition;
  projectId: string;
  visibleRunIds?: string[];
  selectedRunId?: string;
  targetProfile?: PluginRuntimeContext["targetProfile"];
  timeRange?: PluginRuntimeContext["timeRange"];
  theme?: "light" | "dark";
  density?: "comfortable" | "compact";
}

export function PluginHost({
  plugin,
  projectId,
  visibleRunIds = [],
  selectedRunId,
  targetProfile,
  timeRange,
  theme = "light",
  density = "comfortable",
}: PluginHostProps) {
  const [context, setContext] = useState<PluginRuntimeContext | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Create mock data source and host API
    const dataSource = createMockDataSource();
    const api = createMockHostApi(dataSource);
    const eventBus = createMockEventBus();

    const runtimeContext: PluginRuntimeContext = {
      projectId,
      visibleRunIds,
      selectedRunId,
      targetProfile,
      timeRange,
      api,
      events: eventBus,
      theme,
      density,
    };

    setContext(runtimeContext);

    // For direct mount (non-iframe), load and mount plugin
    if (!plugin.manifest.entry && containerRef.current) {
      plugin
        .load()
        .then(async (module) => {
          if (module.mount && containerRef.current) {
            const cleanup = await Promise.resolve(module.mount(runtimeContext, containerRef.current));
            if (cleanup && typeof cleanup === "function") {
              cleanupRef.current = cleanup;
            }
          }
        })
        .catch((err) => {
          setError(err);
        });
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [plugin, projectId, visibleRunIds.join(","), selectedRunId]);

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#D82A2D" }}>
        <p>Failed to load plugin: {error.message}</p>
      </div>
    );
  }

  if (!context) {
    return <div style={{ padding: "1rem" }}>Loading plugin...</div>;
  }

  // If plugin has entry URL, use iframe
  if (plugin.manifest.entry) {
    return (
      <div style={{ width: "100%", height: "100%" }}>
        <PluginFrame manifest={plugin.manifest} context={context} onError={setError} />
      </div>
    );
  }

  // Otherwise, direct mount
  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
  );
}

