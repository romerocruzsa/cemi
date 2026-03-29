import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { ReactNode } from "react";
import { cn } from "../../ui/utils";

interface BentoCardProps {
  title: string;
  chip?: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" };
  primaryValue: ReactNode;
  microVisual?: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3;
}

export function BentoCard({
  title,
  chip,
  primaryValue,
  microVisual,
  action,
  className,
  colSpan = 3,
  rowSpan = 1,
}: BentoCardProps) {
  return (
    <Card
      className={cn(
        className,
        colSpan === 1 && "col-span-1",
        colSpan === 2 && "col-span-2",
        colSpan === 3 && "col-span-3",
        colSpan === 4 && "col-span-4",
        colSpan === 5 && "col-span-5",
        colSpan === 6 && "col-span-6",
        colSpan === 7 && "col-span-7",
        colSpan === 8 && "col-span-8",
        colSpan === 9 && "col-span-9",
        colSpan === 10 && "col-span-10",
        colSpan === 11 && "col-span-11",
        colSpan === 12 && "col-span-12",
        rowSpan === 2 && "row-span-2",
        rowSpan === 3 && "row-span-3"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-[#0F3455]/70">{title}</CardTitle>
          {chip && (
            <Badge variant={chip.variant || "secondary"} className="text-xs">
              {chip.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold text-[#0F3455]">{primaryValue}</div>
        {microVisual && <div className="mt-2">{microVisual}</div>}
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs text-[#D82A2D] hover:underline mt-2"
          >
            {action.label} →
          </button>
        )}
      </CardContent>
    </Card>
  );
}





