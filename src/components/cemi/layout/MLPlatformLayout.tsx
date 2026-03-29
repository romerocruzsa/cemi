import React from "react";
import { ArrowLeft, Activity, Play, GitCompare, Terminal } from "lucide-react";
import { BottomDock } from "./BottomDock";
import { theme } from "../../../theme";
import type { ExperimentOption } from "../../../utils/experiments";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";

interface MLPlatformLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  toolThemeMode: "default" | "light";
  currentProject?: string;
  currentProjectName?: string;
  projects?: Array<{ id: string; name: string }>;
  currentExperiment?: string;
  experiments?: ExperimentOption[];
  selectedRunId?: string | null;
  selectedRunName?: string | null;
  runSummary?: {
    totalRuns: number;
    runningRuns: number;
    compareRuns: number;
  };
  onNavigate: (path: string) => void;
  onToolThemeModeChange: (mode: "default" | "light") => void;
  onProjectChange?: (projectId: string) => void;
  onExperimentChange?: (experimentId: string) => void;
}

export function MLPlatformLayout({
  children,
  currentPath,
  toolThemeMode,
  currentProject,
  currentProjectName,
  projects = [],
  currentExperiment = "__all__",
  experiments = [],
  selectedRunId = null,
  selectedRunName = null,
  runSummary,
  onNavigate,
  onToolThemeModeChange,
  onProjectChange,
  onExperimentChange,
}: MLPlatformLayoutProps) {
  const showProjectShell = Boolean(currentProject && currentPath !== "/workspace");
  const workspaceSurfaceColor = toolThemeMode === "light" ? "#FFFFFF" : theme.colors.beige.lightest;
  const dockSurfaceColor =
    toolThemeMode === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(249, 245, 234, 0.88)";
  const workspaceThemeVars = {
    "--cemi-surface-bg": workspaceSurfaceColor,
    "--cemi-dock-bg": dockSurfaceColor,
  } as React.CSSProperties;

  const resolvedProjectName =
    currentProjectName || projects.find((project) => project.id === currentProject)?.name || currentProject || "Project";

  if (showProjectShell) {
    const tabsValue = currentPath;

    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: workspaceSurfaceColor,
          color: theme.colors.foreground,
          ...workspaceThemeVars,
        }}
      >
        <div className="flex min-h-screen min-w-0 flex-col">
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 pb-28 sm:px-6 sm:py-4 sm:pb-28">
            <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-[1180px] flex-col">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate("/workspace")}
                    aria-label="Back to workspace"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[rgba(15,52,85,0.68)] transition-colors hover:bg-[rgba(15,52,85,0.05)] hover:text-[#0F3455] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3455]/20"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h1 className="min-w-0 break-words text-2xl font-semibold leading-tight text-[#0F3455] sm:text-3xl">
                    {resolvedProjectName}
                  </h1>
                </div>
              </div>

              <Tabs
                value={tabsValue}
                onValueChange={(value) => onNavigate(value)}
                className="mb-4"
              >
                <TabsList variant="line" className="overflow-x-auto" data-tour="project-tabs">
                  <TabsTrigger value="/workspace/runs" data-tour="tab-runs">
                    <Play className="h-4 w-4" />
                    Runs
                  </TabsTrigger>
                  <TabsTrigger value="/workspace/charts">
                    <Activity className="h-4 w-4" />
                    Charts
                  </TabsTrigger>
                  <TabsTrigger value="/workspace/compare" data-tour="tab-compare">
                    <GitCompare className="h-4 w-4" />
                    Compare
                  </TabsTrigger>
                  <TabsTrigger value="/workspace/console" data-tour="tab-console">
                    <Terminal className="h-4 w-4" />
                    Console
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {children}
            </div>
          </main>
        </div>
        <BottomDock
          currentPath={currentPath}
          onNavigate={onNavigate}
          toolThemeMode={toolThemeMode}
          onToolThemeModeChange={onToolThemeModeChange}
          hasSelectedWorkspace
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: workspaceSurfaceColor,
        paddingBottom: theme.spacing.bottomDockHeight,
        ...workspaceThemeVars,
      }}
    >
      <main
        style={{
          padding: "1rem",
          height: `calc(100vh - ${theme.spacing.bottomDockHeight})`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
      <BottomDock
        currentPath={currentPath}
        onNavigate={onNavigate}
        toolThemeMode={toolThemeMode}
        onToolThemeModeChange={onToolThemeModeChange}
        hasSelectedWorkspace={!!currentProject && currentPath !== "/workspace"}
      />
    </div>
  );
}
