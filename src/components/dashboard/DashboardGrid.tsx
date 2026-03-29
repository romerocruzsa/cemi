// src/components/dashboard/DashboardGrid.tsx

import React from "react";
import { DashboardLayout } from "./DashboardLayout";
import { DashboardProvider, useDashboardContext } from "./DashboardContext";
import { WidgetFrame } from "../ui/widget/WidgetFrame";
import { WidgetControls } from "../ui/widget/WidgetControls";
import {
  TimeseriesRenderer,
  ScatterRenderer,
  TableRenderer,
  DistributionRenderer,
  TextViewerRenderer,
} from "../ui/widget";
import type {
  DashboardLayout as DashboardLayoutType,
  WidgetConfig,
  WidgetContext,
} from "../ui/widget/types";
import type {
  TimeseriesDataPoint,
  ScatterDataPoint,
  TableDataRow,
  DistributionDataPoint,
} from "../ui/widget/renderers";

export interface DashboardGridProps {
  layout: DashboardLayoutType;
  context: WidgetContext;
  widgetData: Record<string, unknown>;
  onWidgetAction?: (widgetId: string, action: string) => void;
  className?: string;
}

function WidgetRenderer({
  widgetId,
  config,
  data,
  onAction,
}: {
  widgetId: string;
  config: WidgetConfig;
  data: unknown;
  onAction?: (widgetId: string, action: string) => void;
}) {
  const context = useDashboardContext();

  const renderWidgetBody = () => {
    switch (config.type) {
      case "timeseries":
        return (
          <TimeseriesRenderer
            data={data as TimeseriesDataPoint[]}
            config={config}
            context={context}
          />
        );
      case "scatter":
        return (
          <ScatterRenderer
            data={data as ScatterDataPoint[]}
            config={config}
            context={context}
          />
        );
      case "table":
        return (
          <TableRenderer
            data={data as TableDataRow[]}
            config={config}
            context={context}
          />
        );
      case "distribution":
        return (
          <DistributionRenderer
            data={data as DistributionDataPoint[]}
            config={config}
            context={context}
          />
        );
      case "text":
        return (
          <TextViewerRenderer
            data={data as string}
            config={config}
            context={context}
          />
        );
      default:
        return <div>Unknown widget type</div>;
    }
  };

  const renderControls = () => {
    const controls: React.ReactNode[] = [];

    if (config.type === "timeseries") {
      controls.push(
        <WidgetControls
          key="controls"
          metricSelector={{
            value: config.metric,
            options: ["accuracy", "loss", "latency", "memory"],
            onValueChange: (value) => {
              // In real implementation, this would update config
              console.log("Metric changed:", value);
            },
          }}
          toggle={
            config.showBaseline !== undefined
              ? {
                  label: "Baseline",
                  checked: config.showBaseline,
                  onCheckedChange: (checked) => {
                    console.log("Baseline toggled:", checked);
                  },
                }
              : undefined
          }
          overflowMenu={{
            onExpand: () => onAction?.(widgetId, "expand"),
            onDuplicate: () => onAction?.(widgetId, "duplicate"),
            onRemove: () => onAction?.(widgetId, "remove"),
          }}
        />
      );
    } else if (config.type === "table") {
      controls.push(
        <WidgetControls
          key="controls"
          columnSelector={{
            value: config.columns,
            options: config.columns,
            onValueChange: (value) => {
              console.log("Columns changed:", value);
            },
          }}
          overflowMenu={{
            onExpand: () => onAction?.(widgetId, "expand"),
            onDuplicate: () => onAction?.(widgetId, "duplicate"),
            onRemove: () => onAction?.(widgetId, "remove"),
          }}
        />
      );
    } else {
      controls.push(
        <WidgetControls
          key="controls"
          overflowMenu={{
            onExpand: () => onAction?.(widgetId, "expand"),
            onDuplicate: () => onAction?.(widgetId, "duplicate"),
            onRemove: () => onAction?.(widgetId, "remove"),
          }}
        />
      );
    }

    return controls[0] || null;
  };

  // Determine widget status
  let status: "idle" | "loading" | "error" | "empty" = "idle";
  if (!data) {
    status = "empty";
  } else if (Array.isArray(data) && data.length === 0) {
    status = "empty";
  } else if (typeof data === "string" && data.length === 0) {
    status = "empty";
  }

  return (
    <WidgetFrame
      id={widgetId}
      title={config.title}
      subtitle={config.subtitle}
      status={status}
      statusProps={{
        empty: {
          title: "No data available",
          description: `No ${config.type} data found for selected runs.`,
        },
      }}
      controls={renderControls()}
      body={renderWidgetBody()}
    />
  );
}

export function DashboardGrid({
  layout,
  context,
  widgetData,
  onWidgetAction,
  className,
}: DashboardGridProps) {
  return (
    <DashboardProvider value={context}>
      <DashboardLayout
        layout={layout}
        columns={layout.columns}
        className={className}
      >
        {(widgetId, position) => {
          const widget = layout.widgets.find((w) => w.widgetId === widgetId);
          if (!widget) return null;

          return (
            <WidgetRenderer
              key={widgetId}
              widgetId={widgetId}
              config={widget.config}
              data={widgetData[widgetId]}
              onAction={onWidgetAction}
            />
          );
        }}
      </DashboardLayout>
    </DashboardProvider>
  );
}



