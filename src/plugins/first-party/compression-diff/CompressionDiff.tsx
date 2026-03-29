// src/plugins/first-party/compression-diff/CompressionDiff.tsx

import React, { useEffect, useState } from "react";
import type { PluginRuntimeContext } from "../../types";
import type { RunRecord } from "../../../types/domain";

interface CompressionDiffProps {
  context: PluginRuntimeContext;
}

export function CompressionDiff({ context }: CompressionDiffProps) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    context.api
      .listRuns(context.projectId)
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [context.projectId, context.api]);

  // Filter FP32 vs INT8 runs
  const fp32Runs = runs.filter(
    (r) => r.quantization === "fp32" || r.tags.find((t) => t.value === "FP32")
  );
  const int8Runs = runs.filter(
    (r) => r.quantization === "int8" || r.tags.find((t) => t.value === "INT8")
  );

  const fp32 = fp32Runs[0];
  const int8 = int8Runs[0];

  const fp32Metrics = fp32?.summary_metrics || {};
  const int8Metrics = int8?.summary_metrics || {};

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#0F3455" }}>
        Loading comparison data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "#D82A2D" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (fp32Runs.length === 0 && int8Runs.length === 0) {
    return (
      <div style={{ padding: "2rem", color: "#0F3455" }}>
        <h2 style={{ marginTop: 0 }}>Compression Comparison</h2>
        <p>No FP32 or INT8 runs found for comparison.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "system-ui", color: "#0F3455" }}>
      <h2 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 600 }}>
        Compression Comparison
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(15, 52, 85, 0.2)",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "1.2rem" }}>FP32 Baseline</h3>
          <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            <div>
              Accuracy:{" "}
              {fp32Metrics.accuracy_delta !== undefined
                ? `${(fp32Metrics.accuracy_delta * 100).toFixed(2)}%`
                : "N/A"}
            </div>
            <div>
              Latency p95: {fp32Metrics.latency_p95_ms?.toFixed(2) || "N/A"}ms
            </div>
            <div>
              Model Size: {fp32Metrics.model_size_mb?.toFixed(1) || "N/A"}MB
            </div>
          </div>
        </div>
        <div
          style={{
            border: "1px solid rgba(15, 52, 85, 0.2)",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "1.2rem" }}>INT8 Compressed</h3>
          <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            <div>
              Accuracy:{" "}
              {int8Metrics.accuracy_delta !== undefined
                ? `${(int8Metrics.accuracy_delta * 100).toFixed(2)}%`
                : "N/A"}
            </div>
            <div>
              Latency p95: {int8Metrics.latency_p95_ms?.toFixed(2) || "N/A"}ms
            </div>
            <div>
              Model Size: {int8Metrics.model_size_mb?.toFixed(1) || "N/A"}MB
            </div>
          </div>
        </div>
      </div>
      {fp32 && int8 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "rgba(15, 52, 85, 0.05)",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "1.2rem" }}>Delta</h3>
          <div style={{ fontSize: "0.9rem" }}>
            <div>
              Accuracy Change:{" "}
              {(
                (int8Metrics.accuracy_delta || 0) -
                (fp32Metrics.accuracy_delta || 0)
              ).toFixed(2)}
              %
            </div>
            <div>
              Latency Improvement:{" "}
              {(
                (fp32Metrics.latency_p95_ms || 0) -
                (int8Metrics.latency_p95_ms || 0)
              ).toFixed(2)}
              ms
            </div>
            <div>
              Size Reduction:{" "}
              {(
                (fp32Metrics.model_size_mb || 0) -
                (int8Metrics.model_size_mb || 0)
              ).toFixed(1)}
              MB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
