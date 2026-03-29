// src/components/ui/segmented-toggle.tsx

import * as React from "react";
import { cn } from "./utils";

export interface SegmentedToggleOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedToggleProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedToggleOption<T>[];
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export function SegmentedToggle<T extends string = string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  disabled = false,
}: SegmentedToggleProps<T>) {
  const sizeClasses = {
    sm: "h-7 text-xs",
    md: "h-8 text-sm",
    lg: "h-9 text-sm",
  };

  const paddingClasses = {
    sm: "px-8",
    md: "px-8",
    lg: "px-8",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-[rgba(15,52,85,0.2)] bg-[rgba(15,52,85,0.02)] p-0.5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="group"
      aria-label="Segmented toggle"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded transition-all font-medium",
              sizeClasses[size],
              paddingClasses[size],
              isActive
                ? "bg-[#C1272D] text-[#F9F5EA] shadow-sm"
                : "text-[#0F3455] hover:bg-[rgba(15,52,85,0.08)]",
              isActive && "!bg-[#C1272D]",
              isDisabled && "cursor-not-allowed opacity-50",
              !isActive && !isDisabled && "cursor-pointer"
            )}
            style={isActive ? { backgroundColor: '#C1272D', color: '#F9F5EA' } : undefined}
          >
            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

