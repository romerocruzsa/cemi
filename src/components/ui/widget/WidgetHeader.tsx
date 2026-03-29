// src/components/ui/widget/WidgetHeader.tsx

import React from "react";
import { CardHeader, CardTitle } from "../card";
import { WidgetControls } from "./WidgetControls";

export interface WidgetHeaderProps {
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
}

export function WidgetHeader({ title, subtitle, controls }: WidgetHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="flex flex-col gap-0.5">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {controls && <div className="flex items-center gap-1">{controls}</div>}
    </CardHeader>
  );
}
