import React, { forwardRef, useImperativeHandle, useRef } from "react";
import ReactOnnx from "@wolanx/react-netron";

export type NetronNodeSummary = { id: string; name: string; opType: string };
export type NetronGraphSummary = {
  graphs: Array<{ id: string; name: string; nodes: NetronNodeSummary[] }>;
};

export type NetronNodeDetails = {
  id: string;
  name: string;
  opType: string;
  inputs: Array<{ name: string; value: Array<{ name: string; type: string | null; initializer: boolean }> }>;
  outputs: Array<{ name: string; value: Array<{ name: string; type: string | null; initializer: boolean }> }>;
  attributes: Array<{ name: string; type: string | null; value: string }>;
};

export interface NetronViewerHandle {
  open: () => void;
  getGraphSummary: () => NetronGraphSummary;
  getNodeDetails: (nodeId: string) => NetronNodeDetails | null;
  selectNode: (nodeId: string) => boolean;
}

type NetronViewerProps = {
  file: Blob | null;
  direction?: "horizontal" | "vertical";
  onSelectionChange?: (nodeId: string | null) => void;
};

/**
 * Thin wrapper around @wolanx/react-netron.
 * We patch the package at runtime (node_modules) to expose a minimal ref API and selection callback.
 */
export const NetronViewer = forwardRef<NetronViewerHandle, NetronViewerProps>(function NetronViewer(
  { file, direction = "horizontal", onSelectionChange },
  ref
) {
  const innerRef = useRef<any>(null);
  // Important: innerRef.current is assigned after mount; expose stable methods that delegate at call time.
  useImperativeHandle(
    ref,
    () => ({
      open: () => innerRef.current?.open?.(),
      getGraphSummary: () => innerRef.current?.getGraphSummary?.() ?? { graphs: [] },
      getNodeDetails: (nodeId: string) => innerRef.current?.getNodeDetails?.(nodeId) ?? null,
      selectNode: (nodeId: string) => innerRef.current?.selectNode?.(nodeId) ?? false,
    }),
    []
  );

  // Package types don’t include our patched props; cast to any.
  const ReactOnnxAny = ReactOnnx as unknown as React.ComponentType<any>;

  return (
    <ReactOnnxAny
      ref={innerRef}
      width="100%"
      height="100%"
      file={file}
      direction={direction}
      onSelectionChange={onSelectionChange}
    />
  );
});


