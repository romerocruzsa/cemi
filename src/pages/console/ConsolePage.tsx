import React, { useEffect, useMemo, useRef } from "react";
import { Terminal } from "lucide-react";
import { Page } from "../../components/cemi/layout/Page";
import type { RunActionEvent, RunRecord } from "../../types/domain";

type ConsoleLevel = "info" | "success" | "warn" | "error";

interface ConsolePageProps {
  projectName?: string;
  runs: RunRecord[];
  selectedRunId?: string | null;
  onSelectRun?: (runId: string) => void;
}

interface ConsoleEntry {
  id: string;
  action: string;
  level: ConsoleLevel;
  deviceLabel: string;
  summary: string;
  output: string;
  occurredAt: number | null;
  order: number;
}

interface ConsoleFeed {
  entries: ConsoleEntry[];
}

function getTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatConsoleTimestamp(entry: ConsoleEntry): string {
  if (entry.occurredAt === null) return "--:--:--";
  return new Date(entry.occurredAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getTagValue(run: RunRecord, key: string): string | null {
  const tagValue = run.tags?.find((tag) => tag.key === key)?.value;
  if (typeof tagValue === "string" && tagValue.trim()) return tagValue.trim();
  return null;
}

function getParamValue(run: RunRecord, key: string): string | null {
  const paramValue = run.params?.find((param) => param.key === key)?.value;
  if (typeof paramValue === "string" && paramValue.trim()) return paramValue.trim();
  if (typeof paramValue === "number" || typeof paramValue === "boolean") return String(paramValue);
  return null;
}

function getDeviceLabel(run: RunRecord): string {
  return (
    run.context?.device?.board ||
    run.target_profile?.name ||
    run.context?.device?.runtime?.toString() ||
    getParamValue(run, "device") ||
    getParamValue(run, "runtime") ||
    getTagValue(run, "device") ||
    getTagValue(run, "runtime") ||
    "n/a"
  );
}

function normalizeConsoleLevel(value: unknown, fallback: ConsoleLevel = "info"): ConsoleLevel {
  if (typeof value !== "string") return fallback;
  const normalized = value.toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "warn" || normalized === "warning") return "warn";
  if (normalized === "error" || normalized === "failed" || normalized === "fatal") return "error";
  return "info";
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function buildConsoleFeed(runs: RunRecord[]): ConsoleFeed {
  const entries = runs.flatMap((run, runIndex) => {
    const fallbackDeviceLabel = getDeviceLabel(run);
    const actionEvents = Array.isArray(run.action_events) ? run.action_events : [];

    return actionEvents.map((event: RunActionEvent, eventIndex: number) => ({
      id: event.id || `${run.id}-action-${eventIndex + 1}`,
      action: normalizeText(event.action, "cemi_event"),
      level: normalizeConsoleLevel(event.level),
      deviceLabel: normalizeText(event.device, fallbackDeviceLabel),
      summary: normalizeText(event.summary, event.run_name || run.name || run.id.slice(0, 8)),
      output: normalizeText(event.output, ""),
      occurredAt: getTimestamp(event.timestamp_ms) ?? getTimestamp(event.timestamp),
      order: runIndex * 10000 + eventIndex,
    }));
  });

  return {
    entries: [...entries].sort((left, right) => {
      if (left.occurredAt !== null && right.occurredAt !== null && left.occurredAt !== right.occurredAt) {
        return left.occurredAt - right.occurredAt;
      }
      if (left.occurredAt !== null && right.occurredAt === null) return -1;
      if (left.occurredAt === null && right.occurredAt !== null) return 1;
      return left.order - right.order;
    }),
  };
}

function getLevelColor(level: ConsoleLevel): string {
  if (level === "error") return "#F5F5F5";
  if (level === "warn") return "#F5F5F5";
  if (level === "success") return "#F5F5F5";
  return "#F5F5F5";
}

export function ConsolePage({ runs }: ConsolePageProps) {
  const sortedRuns = useMemo(
    () =>
      [...runs].sort((left, right) => {
        const leftUpdated = getTimestamp(left.updated_at) ?? getTimestamp(left.created_at) ?? 0;
        const rightUpdated = getTimestamp(right.updated_at) ?? getTimestamp(right.created_at) ?? 0;
        return rightUpdated - leftUpdated;
      }),
    [runs]
  );
  const consoleFeed = useMemo(() => buildConsoleFeed(sortedRuns), [sortedRuns]);
  const consoleViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = consoleViewportRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [consoleFeed.entries.length]);

  const consolePanelBackground = "#1C1C1C";
  const consoleViewportBackground = "#232323";
  const consoleBorderColor = "#343434";
  const consoleHeaderBorderColor = "#2C2C2C";

  const panelStyle: React.CSSProperties = {
    minHeight: "620px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: `1px solid ${consoleBorderColor}`,
    backgroundColor: consolePanelBackground,
    color: "#F5F5F5",
    boxShadow: "none",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    borderBottom: `1px solid ${consoleHeaderBorderColor}`,
    backgroundColor: consolePanelBackground,
    color: "#FAFAFA",
    padding: "0.75rem 1rem",
  };

  const viewportStyle: React.CSSProperties = {
    minHeight: 0,
    flex: 1,
    overflow: "auto",
    backgroundColor: consoleViewportBackground,
    color: "#FFFFFF",
    padding: "1rem",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "13px",
    lineHeight: 1.75,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    minWidth: "max-content",
    alignItems: "center",
    gap: "0.75rem",
    whiteSpace: "nowrap",
    color: "#F5F5F5",
  };

  const promptStyle: React.CSSProperties = {
    flexShrink: 0,
    color: "#E5E5E5",
  };

  const timestampStyle: React.CSSProperties = {
    display: "inline-block",
    width: "100px",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#A3A3A3",
  };

  const deviceStyle: React.CSSProperties = {
    display: "inline-block",
    width: "180px",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#B3B3B3",
  };

  const actionBaseStyle: React.CSSProperties = {
    display: "inline-block",
    width: "160px",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const summaryStyle: React.CSSProperties = {
    display: "inline-block",
    width: "220px",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#F5F5F5",
  };

  const outputStyle: React.CSSProperties = {
    display: "inline-block",
    minWidth: "420px",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#FFFFFF",
  };

  return (
    <Page title="" subtitle="" fullWidth>
      <div className="flex min-h-0">
        <div style={panelStyle} data-tour="console-panel">
          <div style={headerStyle}>
            <Terminal className="h-4 w-4" style={{ color: "#E5E5E5" }} />
            <span
              className="font-mono text-sm"
              style={{
                color: "#FAFAFA",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              }}
            >
              cemi.console
            </span>
          </div>

          <div ref={consoleViewportRef} style={viewportStyle} data-tour="console-feed">
            {consoleFeed.entries.length > 0 ? (
              <div className="space-y-1">
                {consoleFeed.entries.map((entry) => (
                  <div key={entry.id} style={rowStyle}>
                    <span style={promptStyle}>$</span>
                    <span style={timestampStyle} title={formatConsoleTimestamp(entry)}>
                      [{formatConsoleTimestamp(entry)}]
                    </span>
                    <span style={deviceStyle} title={entry.deviceLabel}>
                      [{entry.deviceLabel}]
                    </span>
                    <span
                      style={{
                        ...actionBaseStyle,
                        color: getLevelColor(entry.level),
                      }}
                      title={entry.action}
                    >
                      [{entry.action}]
                    </span>
                    <span style={summaryStyle} title={entry.summary}>
                      {entry.summary}
                    </span>
                    <span style={outputStyle} title={entry.output}>
                      {entry.output}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#B3B3B3" }}>$ waiting for cemi output...</div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
