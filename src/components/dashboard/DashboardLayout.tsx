// src/components/dashboard/DashboardLayout.tsx

import React from "react";
import type { DashboardLayout as DashboardLayoutType, WidgetGridPosition } from "../ui/widget/types";

export interface DashboardLayoutProps {
  layout: DashboardLayoutType;
  children: (widgetId: string, position: WidgetGridPosition) => React.ReactNode;
  columns?: number;
  className?: string;
}

export function DashboardLayout({
  layout,
  children,
  columns = 12,
  className,
}: DashboardLayoutProps) {
  // Create grid template columns
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  // Calculate grid positions
  const gridItems = layout.widgets.map((widget) => ({
    id: widget.widgetId,
    position: widget.position,
    element: children(widget.widgetId, widget.position),
  }));

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns,
        gap: "1rem",
        width: "100%",
      }}
    >
      {gridItems.map((item) => (
        <div
          key={item.id}
          style={{
            gridColumn: `span ${item.position.w}`,
            gridRow: `span ${item.position.h}`,
            minHeight: 0, // Prevent grid items from overflowing
          }}
        >
          {item.element}
        </div>
      ))}
    </div>
  );
}
