// src/components/ui/widget/WidgetFooter.tsx

import React from "react";
import { CardFooter } from "../card";

export interface WidgetFooterProps {
  summary?: string;
  lastUpdated?: Date;
  className?: string;
}

export function WidgetFooter({ summary, lastUpdated, className }: WidgetFooterProps) {
  if (!summary && !lastUpdated) {
    return null;
  }

  return (
    <CardFooter className={className}>
      <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
        {summary && <span>{summary}</span>}
        {lastUpdated && (
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </CardFooter>
  );
}
