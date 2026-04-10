// src/utils/workspaceThemeCssVars.ts

import { theme } from "../theme";

export type WorkspaceToolThemeMode = "default" | "light";

/** Surface + dock colors and CSS custom properties used across the workspace shell (and portaled UI). */
export function getWorkspaceThemeCssVars(mode: WorkspaceToolThemeMode) {
  const workspaceSurfaceColor = mode === "light" ? "#FFFFFF" : theme.colors.beige.lightest;
  const dockSurfaceColor =
    mode === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(249, 245, 234, 0.88)";
  return {
    workspaceSurfaceColor,
    cssVars: {
      "--cemi-surface-bg": workspaceSurfaceColor,
      "--cemi-dock-bg": dockSurfaceColor,
    } as const,
  };
}
