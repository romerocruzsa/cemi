import { Badge } from "../../ui/badge";
import { TargetProfile } from "../../../types/cemi";
import { cn } from "../../ui/utils";

interface TargetProfileChipProps {
  profile: TargetProfile;
  className?: string;
}

export function TargetProfileChip({ profile, className }: TargetProfileChipProps) {
  return (
    <Badge variant="outline" className={cn(className)}>
      {profile.name}
    </Badge>
  );
}



