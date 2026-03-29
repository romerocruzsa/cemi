import { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standardized filter bar component.
 * All filters must be placed in this component, not scattered across cards.
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={`flex items-center gap-4 p-4 bg-[#F9F5EA] border border-[#0F3455]/10 rounded-lg ${className || ""}`}>
      {children}
    </div>
  );
}



