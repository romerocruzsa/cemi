// src/components/ui/widget/WidgetStates.tsx

import React from "react";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { Loader2, AlertCircle, FileX, Info } from "lucide-react";

export interface WidgetEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
}

export function WidgetEmptyState({
  icon,
  title,
  description,
  cta,
}: WidgetEmptyStateProps) {
  return (
    <CardContent className="flex flex-col items-center justify-center py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        {icon || <FileX className="h-8 w-8 text-muted-foreground opacity-50" />}
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
        )}
        {cta && (
          <Button variant="outline" size="sm" onClick={cta.onClick} className="mt-2">
            {cta.label}
          </Button>
        )}
      </div>
    </CardContent>
  );
}

export interface WidgetLoadingStateProps {
  skeleton?: React.ReactNode;
}

export function WidgetLoadingState({ skeleton }: WidgetLoadingStateProps) {
  if (skeleton) {
    return <CardContent>{skeleton}</CardContent>;
  }

  return (
    <CardContent className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </CardContent>
  );
}

export interface WidgetErrorStateProps {
  error: string | Error;
  onRetry?: () => void;
}

export function WidgetErrorState({ error, onRetry }: WidgetErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <CardContent className="flex flex-col items-center justify-center py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <h3 className="text-sm font-medium">Error loading widget</h3>
        <p className="text-xs text-muted-foreground max-w-sm">{errorMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            Retry
          </Button>
        )}
      </div>
    </CardContent>
  );
}

export interface WidgetPartialStateProps {
  message: string;
  children: React.ReactNode;
}

export function WidgetPartialState({ message, children }: WidgetPartialStateProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b">
        <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <span className="text-xs text-yellow-800 dark:text-yellow-200">{message}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
