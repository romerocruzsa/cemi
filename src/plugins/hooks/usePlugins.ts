// src/plugins/hooks/usePlugins.ts

import { useState, useEffect } from "react";
import type { PluginDefinition, PluginActivationContext } from "../types";
import { getPluginDefinitions } from "../registry";

export function usePlugins(context: PluginActivationContext) {
  const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const allPlugins = getPluginDefinitions();
      // Filter active plugins
      const active = allPlugins.filter(p => {
        if (p.isActive) {
          return p.isActive(context);
        }
        return true;
      });
      setPlugins(active);
    } catch (error) {
      console.error("Failed to load plugins:", error);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, [context.projectId, context.visibleRunIds.join(","), context.selectedRunId]);

  return { plugins, loading };
}



import { useState, useEffect } from "react";
import type { PluginDefinition, PluginActivationContext } from "../types";
import { getPluginDefinitions } from "../registry";

export function usePlugins(context: PluginActivationContext) {
  const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const allPlugins = getPluginDefinitions();
      // Filter active plugins
      const active = allPlugins.filter(p => {
        if (p.isActive) {
          return p.isActive(context);
        }
        return true;
      });
      setPlugins(active);
    } catch (error) {
      console.error("Failed to load plugins:", error);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, [context.projectId, context.visibleRunIds.join(","), context.selectedRunId]);

  return { plugins, loading };
}




