// src/plugins/PluginFrame.tsx

import React, { useEffect, useRef, useState } from "react";
import type { PluginManifest, PluginRuntimeContext } from "./types";
import type { HostToPluginMessage, PluginToHostMessage } from "./protocol";

interface PluginFrameProps {
  manifest: PluginManifest;
  context: PluginRuntimeContext;
  onError?: (error: Error) => void;
}

export function PluginFrame({ manifest, context, onError }: PluginFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<Error | null>(null);
  const messageChannelRef = useRef<MessageChannel | null>(null);

  useEffect(() => {
    // Only create iframe if entry URL is provided
    if (!manifest.entry) {
      // For direct mount plugins, PluginHost handles rendering
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Create message channel for host ↔ plugin communication
    const channel = new MessageChannel();
    messageChannelRef.current = channel;

    // Set up iframe sandbox (security)
    iframe.sandbox.add("allow-scripts", "allow-same-origin");

    // Handle messages from plugin
    const handleMessage = (event: MessageEvent<PluginToHostMessage>) => {
      // Verify origin if needed (for production)
      if (event.data.type === "PLUGIN_READY") {
        // Send context to plugin
        const initMessage: HostToPluginMessage = {
          type: "HOST_INIT",
          payload: { apiVersion: manifest.apiVersion },
        };
        iframe.contentWindow?.postMessage(initMessage, "*");

        const contextMessage: HostToPluginMessage = {
          type: "HOST_CONTEXT",
          payload: context,
        };
        iframe.contentWindow?.postMessage(contextMessage, "*");
      } else if (event.data.type === "PLUGIN_ERROR") {
        const err = new Error(event.data.payload.message);
        setError(err);
        onError?.(err);
      } else if (event.data.type === "PLUGIN_LOG") {
        context.api.log(
          event.data.payload.level,
          event.data.payload.message,
          event.data.payload.meta as Record<string, unknown>
        );
      }
    };

    window.addEventListener("message", handleMessage);

    // Load plugin HTML shell
    const pluginHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: system-ui, -apple-system, sans-serif;
              background: transparent;
            }
            #plugin-root {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div id="plugin-root"></div>
          <script type="module">
            try {
              // Import plugin module
              const pluginModule = await import('${manifest.entry}');
              const plugin = pluginModule.default || pluginModule;
              const container = document.getElementById('plugin-root');
              
              if (!container) {
                throw new Error('Plugin root container not found');
              }
              
              // Wait for context from parent
              let pluginContext = null;
              
              const handleHostMessage = (event) => {
                if (event.data.type === 'HOST_CONTEXT') {
                  pluginContext = event.data.payload;
                  // Mount plugin
                  if (plugin.mount) {
                    const cleanup = plugin.mount(pluginContext, container);
                    // Store cleanup function if returned
                    if (cleanup && typeof cleanup === 'function') {
                      window.__pluginCleanup = cleanup;
                    }
                  }
                } else if (event.data.type === 'HOST_DISPOSE') {
                  if (window.__pluginCleanup) {
                    window.__pluginCleanup();
                  }
                }
              };
              
              window.addEventListener('message', handleHostMessage);
              
              // Request context
              window.parent.postMessage({ 
                type: 'PLUGIN_READY', 
                payload: { 
                  pluginId: '${manifest.id}', 
                  apiVersion: '${manifest.apiVersion}' 
                } 
              }, '*');
            } catch (error) {
              console.error('Plugin load error:', error);
              window.parent.postMessage({
                type: 'PLUGIN_ERROR',
                payload: {
                  message: error.message || 'Failed to load plugin',
                  stack: error.stack
                }
              }, '*');
            }
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([pluginHtml], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    iframe.src = blobUrl;

    // Update context when it changes
    const updateContext = () => {
      if (iframe.contentWindow) {
        const contextMessage: HostToPluginMessage = {
          type: "HOST_CONTEXT",
          payload: context,
        };
        iframe.contentWindow.postMessage(contextMessage, "*");
      }
    };

    // Update context on changes
    const contextUpdateTimer = setInterval(updateContext, 100);

    return () => {
      clearInterval(contextUpdateTimer);
      window.removeEventListener("message", handleMessage);
      if (messageChannelRef.current) {
        messageChannelRef.current.port1.close();
      }
      URL.revokeObjectURL(blobUrl);
      
      // Send dispose message
      if (iframe.contentWindow) {
        const disposeMessage: HostToPluginMessage = {
          type: "HOST_DISPOSE",
        };
        iframe.contentWindow.postMessage(disposeMessage, "*");
      }
    };
  }, [manifest, context, onError]);

  // If no entry URL, don't render iframe (PluginHost will handle direct mount)
  if (!manifest.entry) {
    return null;
  }

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#D82A2D" }}>
        <p>Plugin Error: {error.message}</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
      }}
      title={manifest.name}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
