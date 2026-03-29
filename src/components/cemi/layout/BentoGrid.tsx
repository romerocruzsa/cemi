import { ReactNode } from "react";
import { cn } from "../../ui/utils";
import '../styles/bento-card.css';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive asymmetric bento grid:
 * - Mobile: 1 column
 * - Tablet: 6 columns  
 * - Desktop: 12 columns
 * 
 * Consistent 16px gap (8px spacing scale).
 * All bento layouts must use this component.
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div 
      className={cn(
        "bento-grid-container",
        "grid",
        "grid-cols-1", // Mobile: 1 column
        "md:grid-cols-6", // Tablet: 6 columns
        "lg:grid-cols-12", // Desktop: 12 columns
        "gap-4", // 16px gap
        "auto-rows-min", // Auto row height based on content
        "w-full", // Ensure full width
        className
      )}
    >
      {children}
    </div>
  );
}

