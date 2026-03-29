// src/components/ui/widget/WidgetFrame.tsx

import React from "react";
import { Card } from "../card";
import { WidgetHeader } from "./WidgetHeader";
import { WidgetBody } from "./WidgetBody";
import { WidgetFooter } from "./WidgetFooter";
import {
  WidgetEmptyState,
  WidgetLoadingState,
  WidgetErrorState,
} from "./WidgetStates";

export interface WidgetFrameProps {
  id: string;
  title: string;
  subtitle?: string;
  status?: "idle" | "loading" | "error" | "empty";
  statusProps?: {
    empty?: Parameters<typeof WidgetEmptyState>[0];
    loading?: Parameters<typeof WidgetLoadingState>[0];
    error?: Parameters<typeof WidgetErrorState>[0];
  };
  controls?: React.ReactNode;
  body: React.ReactNode;
  footer?: {
    summary?: string;
    lastUpdated?: Date;
  };
  className?: string;
}

export function WidgetFrame({
  id,
  title,
  subtitle,
  status = "idle",
  statusProps,
  controls,
  body,
  footer,
  className,
}: WidgetFrameProps) {
  const renderContent = () => {
    switch (status) {
      case "loading":
        return <WidgetLoadingState {...statusProps?.loading} />;
      case "error":
        return <WidgetErrorState {...statusProps?.error} />;
      case "empty":
        return <WidgetEmptyState {...statusProps?.empty} />;
      default:
        return <WidgetBody>{body}</WidgetBody>;
    }
  };

  return (
    <Card className={className} data-widget-id={id}>
      <WidgetHeader title={title} subtitle={subtitle} controls={controls} />
      {renderContent()}
      {footer && status === "idle" && (
        <WidgetFooter summary={footer.summary} lastUpdated={footer.lastUpdated} />
      )}
    </Card>
  );
}
