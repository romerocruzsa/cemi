// src/components/ui/metric-card.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface MetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader style={{ paddingBottom: "0.5rem" }}>
        <CardTitle style={{ fontSize: "0.875rem", fontWeight: 500, color: "rgba(15, 52, 85, 0.7)" }}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0F3455" }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: "0.75rem", color: "rgba(15, 52, 85, 0.6)", marginTop: "0.25rem" }}>
            {subtitle}
          </div>
        )}
        {trend && (
          <div
            style={{
              fontSize: "0.75rem",
              color: trend.value >= 0 ? "#10b981" : "#ef4444",
              marginTop: "0.25rem",
            }}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value} {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
