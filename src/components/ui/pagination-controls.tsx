// src/components/ui/pagination-controls.tsx

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "./utils";
import { animationPresets } from "./animated-interactive";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  showItemRange?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
  showItemRange = true,
}: PaginationControlsProps) {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const PaginationButton = ({ 
    onClick, 
    disabled, 
    children, 
    label 
  }: { 
    onClick: () => void; 
    disabled: boolean; 
    children: React.ReactNode;
    label: string;
  }) => (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
        disabled 
          ? "opacity-30 cursor-not-allowed" 
          : "hover:bg-[rgba(15,52,85,0.08)] text-[#0F3455]"
      )}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      transition={animationPresets.spring}
    >
      {children}
    </motion.button>
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm text-[rgba(15,52,85,0.7)]",
        className
      )}
    >
      {showItemRange && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="tabular-nums"
        >
          {totalItems === 0 ? (
            "No items"
          ) : (
            <>
              {startItem}–{endItem} of {totalItems}
            </>
          )}
        </motion.span>
      )}

      <div className="flex items-center gap-0.5">
        {/* First page */}
        <PaginationButton
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </PaginationButton>

        {/* Previous page */}
        <PaginationButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </PaginationButton>

        <span className="px-2 min-w-[4rem] text-center tabular-nums text-xs">
          <span className="font-medium text-[#0F3455]">{currentPage}</span>
          <span className="text-[rgba(15,52,85,0.5)]"> / {totalPages || 1}</span>
        </span>

        {/* Next page */}
        <PaginationButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>

        {/* Last page */}
        <PaginationButton
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </PaginationButton>
      </div>
    </div>
  );
}
