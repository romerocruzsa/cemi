// src/components/ui/animated-interactive.tsx
// Reusable animated components with subtle hover effects matching the BottomDock style

import React, { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./utils";

// Animation presets tuned to roughly match BottomDock motion (springy but not bouncy)
export const animationPresets = {
  spring: { mass: 0.15, stiffness: 80, damping: 18 },
  tooltip: { duration: 0.15 },
  hover: { duration: 0.2 },
  tap: { scale: 0.98 },
};

// Shadow presets aligned with BottomDock-style elevation
export const shadowPresets = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  default: "0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  md: "0 6px 10px -2px rgba(0, 0, 0, 0.12), 0 3px 6px -2px rgba(0, 0, 0, 0.08)",
  lg: "0 10px 18px -3px rgba(0, 0, 0, 0.14), 0 4px 8px -3px rgba(0, 0, 0, 0.10)",
  elevated: "0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

// ============================================================================
// AnimatedButton - A button with subtle scale and shadow hover effects
// ============================================================================
interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "subtle" | "ghost";
  showTooltip?: boolean;
  tooltipText?: string;
  tooltipPosition?: "top" | "bottom";
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, className, variant = "default", showTooltip, tooltipText, tooltipPosition = "top", disabled, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    const shadowVariants = {
      default: { rest: shadowPresets.sm, hover: shadowPresets.md },
      subtle: { rest: shadowPresets.none, hover: shadowPresets.sm },
      ghost: { rest: shadowPresets.none, hover: shadowPresets.none },
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onHoverStart={() => !disabled && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        animate={{
          boxShadow: isHovered ? shadowVariants[variant].hover : shadowVariants[variant].rest,
        }}
        transition={animationPresets.spring}
        disabled={disabled}
        {...props}
      >
        {children}

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && isHovered && tooltipText && (
            <motion.div
              initial={{ opacity: 0, y: tooltipPosition === "top" ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: tooltipPosition === "top" ? 4 : -4 }}
              transition={animationPresets.tooltip}
              className={cn(
                "absolute z-[100] px-2 py-1 text-xs font-medium rounded shadow-lg whitespace-nowrap pointer-events-none",
                "text-white bg-[#0F3455]",
                tooltipPosition === "top" ? "bottom-full mb-10 left-1/2 -translate-x-1/2" : "top-full mt-10 left-1/2 -translate-x-1/2"
              )}
              style={{ color: '#FFFFFF' }}
            >
              <span style={{ color: '#FFFFFF' }}>{tooltipText}</span>
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent",
                  tooltipPosition === "top"
                    ? "top-full border-t-4 border-t-[#0F3455]"
                    : "bottom-full border-b-4 border-b-[#0F3455]"
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);
AnimatedButton.displayName = "AnimatedButton";

// ============================================================================
// AnimatedCard - A card with subtle lift and shadow hover effects
// ============================================================================
interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  clickable?: boolean;
  variant?: "default" | "subtle" | "elevated";
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, clickable = true, variant = "default", onClick, ...props }, ref) => {
    const shadowVariants = {
      default: { rest: shadowPresets.sm, hover: shadowPresets.md },
      subtle: { rest: shadowPresets.none, hover: shadowPresets.sm },
      elevated: { rest: shadowPresets.default, hover: shadowPresets.lg },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "transition-colors",
          clickable && "cursor-pointer",
          className
        )}
        whileHover={clickable ? { y: -2 } : {}}
        whileTap={clickable ? { scale: 0.995 } : {}}
        animate={{
          boxShadow: shadowVariants[variant].rest,
        }}
        transition={animationPresets.spring}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCard.displayName = "AnimatedCard";

// ============================================================================
// AnimatedTableRow - A table row with subtle background and lift hover effects
// ============================================================================
interface AnimatedTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  clickable?: boolean;
  selected?: boolean;
}

export const AnimatedTableRow = forwardRef<HTMLTableRowElement, AnimatedTableRowProps>(
  ({ children, className, clickable = true, selected = false, onClick, ...props }, ref) => {
    return (
      <motion.tr
        ref={ref}
        className={cn(
          "transition-colors",
          clickable && "cursor-pointer",
          selected ? "bg-[rgba(15,52,85,0.05)]" : "",
          className
        )}
        initial={false}
        whileHover={
          clickable
            ? {
                backgroundColor: "rgba(15, 52, 85, 0.05)",
                boxShadow: "inset 0 0 0 1px rgba(15, 52, 85, 0.08)",
              }
            : {}
        }
        whileTap={clickable ? { scale: 0.998 } : {}}
        transition={{ duration: 0.15 }}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.tr>
    );
  }
);
AnimatedTableRow.displayName = "AnimatedTableRow";

// ============================================================================
// AnimatedIconButton - An icon button with scale and subtle shadow effects
// ============================================================================
interface AnimatedIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  tooltipText?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  size?: "sm" | "md" | "lg";
}

export const AnimatedIconButton = forwardRef<HTMLButtonElement, AnimatedIconButtonProps>(
  ({ children, className, tooltipText, tooltipPosition = "top", size = "md", disabled, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    const sizeClasses = {
      sm: "h-7 w-7",
      md: "h-8 w-8",
      lg: "h-10 w-10",
    };

    const tooltipPositionClasses = {
      top: "bottom-full mb-10 left-1/2 -translate-x-1/2",
      bottom: "top-full mt-10 left-1/2 -translate-x-1/2",
      left: "right-full mr-3 top-1/2 -translate-y-1/2",
      right: "left-full ml-3 top-1/2 -translate-y-1/2",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-md transition-colors",
          "hover:bg-[rgba(15,52,85,0.08)]",
          disabled && "opacity-50 cursor-not-allowed",
          sizeClasses[size],
          className
        )}
        onHoverStart={() => !disabled && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={disabled ? {} : { scale: 1.1 }}
        whileTap={disabled ? {} : { scale: 0.9 }}
        transition={animationPresets.spring}
        disabled={disabled}
        {...props}
      >
        {children}

        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && tooltipText && (
            <motion.div
              initial={{ opacity: 0, y: tooltipPosition === "top" ? 4 : tooltipPosition === "bottom" ? -4 : 0, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: tooltipPosition === "top" ? 4 : tooltipPosition === "bottom" ? -4 : 0, scale: 0.95 }}
              transition={animationPresets.tooltip}
              className={cn(
                "absolute z-[100] px-2 py-1 text-xs font-medium rounded shadow-lg whitespace-nowrap pointer-events-none",
                "text-white bg-[#0F3455]",
                tooltipPositionClasses[tooltipPosition]
              )}
              style={{ color: '#FFFFFF' }}
            >
              <span style={{ color: '#FFFFFF' }}>{tooltipText}</span>
              {/* Arrow pointer */}
              {tooltipPosition === "top" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#0F3455]" />
              )}
              {tooltipPosition === "bottom" && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#0F3455]" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);
AnimatedIconButton.displayName = "AnimatedIconButton";

// ============================================================================
// AnimatedBadge - A badge with subtle scale hover effect
// ============================================================================
interface AnimatedBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  clickable?: boolean;
  variant?: "default" | "outline" | "secondary";
}

export const AnimatedBadge = forwardRef<HTMLSpanElement, AnimatedBadgeProps>(
  ({ children, className, clickable = false, variant = "default", onClick, ...props }, ref) => {
    const variantClasses = {
      default: "bg-[#0F3455] text-white",
      outline: "border border-[rgba(15,52,85,0.2)] text-[#0F3455]",
      secondary: "bg-[rgba(15,52,85,0.1)] text-[#0F3455]",
    };

    return (
      <motion.span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
          clickable && "cursor-pointer",
          variantClasses[variant],
          className
        )}
        whileHover={clickable ? { scale: 1.05, boxShadow: shadowPresets.sm } : {}}
        whileTap={clickable ? { scale: 0.95 } : {}}
        transition={animationPresets.spring}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.span>
    );
  }
);
AnimatedBadge.displayName = "AnimatedBadge";

// ============================================================================
// AnimatedInput - An input with focus animation
// ============================================================================
interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <motion.div
        className={cn("relative flex items-center", className)}
        animate={{
          boxShadow: isFocused ? "0 0 0 2px rgba(15, 52, 85, 0.15)" : "none",
        }}
        transition={{ duration: 0.2 }}
        style={{ borderRadius: "8px" }}
      >
        {icon && (
          <motion.div
            className="absolute text-[rgba(15,52,85,0.5)] flex items-center justify-center"
            style={{ left: '0%', paddingLeft: '0.75rem' }}
            animate={{ color: isFocused ? "#0F3455" : "rgba(15, 52, 85, 0.5)" }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-8 py-2 text-sm bg-transparent border border-[rgba(15,52,85,0.2)] rounded-lg outline-none transition-colors",
            "focus:border-[rgba(15,52,85,0.4)]",
            icon && "pl-10",
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </motion.div>
    );
  }
);
AnimatedInput.displayName = "AnimatedInput";

// ============================================================================
// AnimatedSegmentedToggle - Enhanced segmented toggle with animations
// ============================================================================
interface AnimatedSegmentedToggleProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  className?: string;
}

export function AnimatedSegmentedToggle<T extends string = string>({
  value,
  onChange,
  options,
  className,
}: AnimatedSegmentedToggleProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-0.5 rounded-md border border-[rgba(15,52,85,0.2)] bg-[rgba(15,52,85,0.02)]",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 px-8 h-7 text-sm font-medium rounded transition-colors",
              isActive ? "text-[#F9F5EA]" : "text-[#0F3455] hover:bg-[rgba(15,52,85,0.08)]"
            )}
            whileTap={{ scale: 0.95 }}
            transition={animationPresets.spring}
          >
            {/* Animated background */}
            {isActive && (
              <motion.div
                layoutId="segmented-toggle-bg"
                className="absolute inset-0 rounded z-0"
                style={{ backgroundColor: '#0F3455' }}
                transition={animationPresets.spring}
              />
            )}
            <span 
              className="relative z-10 flex items-center gap-1.5"
              style={isActive ? { color: '#F9F5EA' } : undefined}
            >
              {option.icon}
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
