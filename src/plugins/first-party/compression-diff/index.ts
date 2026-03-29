// src/plugins/first-party/compression-diff/index.ts

import type { PluginModule, PluginRuntimeContext } from "../../types";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { CompressionDiff } from "./CompressionDiff";

let reactRoot: Root | null = null;

const plugin: PluginModule = {
  mount: async (ctx: PluginRuntimeContext, container: HTMLElement) => {
    // Clear container
    container.innerHTML = "";
    
    // Create a wrapper div for React
    const rootDiv = document.createElement("div");
    rootDiv.style.width = "100%";
    rootDiv.style.height = "100%";
    container.appendChild(rootDiv);

    // Create React root and render
    reactRoot = createRoot(rootDiv);
    reactRoot.render(React.createElement(CompressionDiff, { context: ctx }));

    // Return cleanup function
    return () => {
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (container.contains(rootDiv)) {
        container.removeChild(rootDiv);
      }
    };
  },
  getInfo: () => ({
    name: "Compression Diff",
    version: "1.0.0",
  }),
};

export default plugin;
