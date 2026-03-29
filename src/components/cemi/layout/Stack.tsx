import { ReactNode } from "react";
import { cn } from "../../ui/utils";

interface StackProps {
  children: ReactNode;
  spacing?: 1 | 2 | 3 | 4 | 6; // 8px scale: 8, 16, 24, 32, 48
  className?: string;
}

/**
 * Vertical spacing helper using 8px scale.
 * spacing={1} = 8px, spacing={2} = 16px, spacing={3} = 24px, spacing={4} = 32px, spacing={6} = 48px
 */
export function Stack({ children, spacing = 2, className }: StackProps) {
  const spacingMap = {
    1: "space-y-2", // 8px
    2: "space-y-4", // 16px
    3: "space-y-6", // 24px
    4: "space-y-8", // 32px
    6: "space-y-12", // 48px
  };

  return (
    <div className={cn(spacingMap[spacing], className)}>
      {children}
    </div>
  );
}





