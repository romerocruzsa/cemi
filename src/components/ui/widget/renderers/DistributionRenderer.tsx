// src/components/ui/widget/renderers/DistributionRenderer.tsx

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DistributionWidgetConfig, WidgetContext } from "../types";

export interface DistributionDataPoint {
  bin: string | number;
  count: number;
  [key: string]: string | number;
}

export interface DistributionRendererProps {
  data: DistributionDataPoint[];
  config: DistributionWidgetConfig;
  context: WidgetContext;
}

export function DistributionRenderer({
  data,
  config,
  context,
}: DistributionRendererProps) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 52, 85, 0.1)" />
        <XAxis
          dataKey="bin"
          stroke="rgba(15, 52, 85, 0.7)"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="rgba(15, 52, 85, 0.7)" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid rgba(15, 52, 85, 0.2)",
            borderRadius: "4px",
          }}
        />
        <Legend />
        <Bar dataKey="count" fill="#0F3455" name="Count" />
      </BarChart>
    </ResponsiveContainer>
  );
}
