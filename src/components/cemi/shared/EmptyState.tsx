import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Empty } from "../../ui/empty";
import { cn } from "../../ui/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed rounded-lg", className)}>
      <CardContent className="p-8">
        <Empty
          icon={icon}
          title={title}
          description={description}
          action={
            actionLabel && onAction ? (
              <Button onClick={onAction} variant="default">
                {actionLabel}
              </Button>
            ) : undefined
          }
        />
      </CardContent>
    </Card>
  );
}

