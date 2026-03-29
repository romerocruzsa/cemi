// src/components/ui/widget/WidgetBody.tsx

import React from "react";
import { CardContent } from "../card";

export interface WidgetBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function WidgetBody({ children, className }: WidgetBodyProps) {
  return (
    <CardContent className={className} style={{ overflow: "visible" }}>
      {children}
    </CardContent>
  );
}
