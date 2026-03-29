// src/components/ui/widget/types.ts

export type WidgetType = "timeseries" | "scatter" | "table" | "distribution" | "text";

export interface WidgetContext {
  selectedRunIds: string[];
  timeRange?: { from: Date; to: Date };
  targetProfile?: string;
  filters?: Record<string, unknown>;
}

export interface BaseWidgetConfig {
  type: WidgetType;
  id: string;
  title: string;
  subtitle?: string;
}

export interface TimeseriesWidgetConfig extends BaseWidgetConfig {
  type: "timeseries";
  metric: string;
  smoothing?: number;
  showBaseline?: boolean;
}

export interface ScatterWidgetConfig extends BaseWidgetConfig {
  type: "scatter";
  xMetric: string;
  yMetric: string;
  colorBy?: "run" | "category";
}

export interface TableWidgetConfig extends BaseWidgetConfig {
  type: "table";
  columns: string[];
  maxRows?: number;
  sortable?: boolean;
}

export interface DistributionWidgetConfig extends BaseWidgetConfig {
  type: "distribution";
  metric: string;
  bins?: number;
}

export interface TextWidgetConfig extends BaseWidgetConfig {
  type: "text";
  contentType?: "log" | "report" | "json";
  searchable?: boolean;
}

export type WidgetConfig =
  | TimeseriesWidgetConfig
  | ScatterWidgetConfig
  | TableWidgetConfig
  | DistributionWidgetConfig
  | TextWidgetConfig;

export interface WidgetGridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  widgetId: string;
  config: WidgetConfig;
  position: WidgetGridPosition;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
  columns?: number;
}
