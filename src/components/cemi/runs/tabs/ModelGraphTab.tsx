// src/components/cemi/runs/tabs/ModelGraphTab.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import type { RunRecord } from "../../../../types/domain";
import { Network } from "lucide-react";

interface ModelGraphTabProps {
  run: RunRecord;
}

export function ModelGraphTab({ run }: ModelGraphTabProps) {
  const hasModelArtifact = run.artifacts.some((a) => a.type === "model");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Graph Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "rgba(15, 52, 85, 0.7)",
          }}
        >
          <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Model graph visualization not yet available
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            {hasModelArtifact
              ? "Model graph visualization will show the network architecture with quantized vs fallback ops overlay."
              : "Upload a model artifact to enable graph visualization."}
          </p>
          <p style={{ fontSize: "0.75rem", marginTop: "1rem", color: "rgba(15, 52, 85, 0.5)" }}>
            Future: Integration with graph visualization library (e.g., cytoscape, vis.js) to display
            model structure, layer connections, and quantization status.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
