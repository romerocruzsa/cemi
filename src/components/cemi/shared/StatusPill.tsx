import { Badge } from "../../ui/badge";
import { RunStatus } from "../../../types/cemi";
import { cn } from "../../ui/utils";

interface StatusPillProps {
  status: RunStatus;
  className?: string;
}

const statusConfig: Record<RunStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  [RunStatus.DRAFT]: { label: "Draft", variant: "outline" },
  [RunStatus.RUNNING]: { label: "Running", variant: "default" },
  [RunStatus.COMPLETED]: { label: "Completed", variant: "secondary" },
  [RunStatus.FAILED]: { label: "Failed", variant: "destructive" },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}





