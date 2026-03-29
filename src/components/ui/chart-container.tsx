// src/components/ui/chart-container.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Loader2 } from "lucide-react";

interface ChartContainerProps {
  title?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | Error | null;
  emptyMessage?: string;
  className?: string;
}

export function ChartContainer({
  title,
  children,
  loading = false,
  error = null,
  emptyMessage = "No data available",
  className,
}: ChartContainerProps) {
  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3rem",
              color: "rgba(15, 52, 85, 0.7)",
            }}
          >
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#D82A2D",
            }}
          >
            <p>Error loading chart</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {React.Children.count(children) === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "rgba(15, 52, 85, 0.7)",
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
