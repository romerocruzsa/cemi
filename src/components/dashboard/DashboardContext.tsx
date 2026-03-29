// src/components/dashboard/DashboardContext.tsx

import React, { createContext, useContext } from "react";
import type { WidgetContext } from "../ui/widget/types";

const DashboardContext = createContext<WidgetContext | null>(null);

export interface DashboardProviderProps {
  value: WidgetContext;
  children: React.ReactNode;
}

export function DashboardProvider({ value, children }: DashboardProviderProps) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext(): WidgetContext {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardContext must be used within DashboardProvider");
  }
  return context;
}
