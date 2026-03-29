import { ReactNode } from "react";
import { CardHeader as UICardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { cn } from "../../ui/utils";

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  chip?: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" };
  actions?: ReactNode;
  className?: string;
}

/**
 * Standardized card header with title, optional subtitle, chip, and right-side actions.
 * All cards must use this component for consistent header layout.
 */
export function CardHeader({ title, subtitle, chip, actions, className }: CardHeaderProps) {
  return (
    <UICardHeader className={cn("pb-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm font-medium mb-1" style={{ color: 'var(--bento-text-primary)' }}>{title}</CardTitle>
          {subtitle && <p className="text-xs" style={{ color: 'var(--bento-text-tertiary)' }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {chip && (
            <Badge variant={chip.variant || "secondary"} className="text-xs">
              {chip.label}
            </Badge>
          )}
          {actions}
        </div>
      </div>
    </UICardHeader>
  );
}

