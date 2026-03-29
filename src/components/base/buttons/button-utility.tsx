// src/components/base/buttons/button-utility.tsx
// Minimal icon button with tooltip - similar to UntitledUI's ButtonUtility

import React, { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../ui/utils";
import { LucideIcon } from "lucide-react";

export interface ButtonUtilityProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon component to render */
  icon: LucideIcon;
  /** Tooltip text shown on hover */
  tooltip?: string;
  /** Button size */
  size?: "xs" | "sm" | "md" | "lg";
  /** Color variant */
  color?: "primary" | "secondary" | "tertiary" | "destructive";
  /** Tooltip position */
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  /** Loading state */
  isLoading?: boolean;
  /** Active/pressed state */
  isActive?: boolean;
}

const sizeConfig = {
  xs: { button: "h-6 w-6", icon: "h-3 w-3" },
  sm: { button: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { button: "h-8 w-8", icon: "h-4 w-4" },
  lg: { button: "h-10 w-10", icon: "h-5 w-5" },
};

const colorConfig = {
  primary: {
    base: "bg-[#0F3455] text-white hover:bg-[#0F3455]/90",
    active: "bg-[#0F3455] text-white",
    iconColor: { base: "text-white", active: "text-white" },
  },
  secondary: {
    base: "bg-transparent border-0 text-[#0F3455] hover:bg-transparent",
    active: "bg-transparent border-0",
    iconColor: { base: "text-[#0F3455]", active: "text-[#C1272D]" },
  },
  tertiary: {
    base: "bg-transparent border-0 text-[rgba(15,52,85,0.7)] hover:bg-transparent hover:text-[#0F3455]",
    active: "bg-transparent border-0",
    iconColor: { base: "text-[#0F3455]", active: "text-[#C1272D]" },
  },
  destructive: {
    base: "bg-transparent border-0 text-[rgba(15,52,85,0.5)] hover:bg-transparent hover:text-[#C1272D]",
    active: "bg-transparent border-0",
    iconColor: { base: "text-[rgba(15,52,85,0.5)]", active: "text-[#C1272D]" },
  },
};

const tooltipPositionConfig = {
  top: "bottom-full mb-10 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-10 left-1/2 -translate-x-1/2",
  left: "right-full mr-3 top-1/2 -translate-y-1/2",
  right: "left-full ml-3 top-1/2 -translate-y-1/2",
};

export const ButtonUtility = forwardRef<HTMLButtonElement, ButtonUtilityProps>(
  (
    {
      icon: Icon,
      tooltip,
      size = "md",
      color = "tertiary",
      tooltipPosition = "top",
      isLoading = false,
      isActive = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);

    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          "relative inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3455]/20",
          sizeConfig[size].button,
          isActive ? colorConfig[color].active : colorConfig[color].base,
          isDisabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onHoverStart={() => !isDisabled && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={isDisabled ? {} : { scale: 1.05 }}
        whileTap={isDisabled ? {} : { scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {isLoading ? (
          <motion.div
            className={cn("border-2 border-current border-t-transparent rounded-full", sizeConfig[size].icon)}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <Icon 
            className={cn(
              sizeConfig[size].icon,
              isActive 
                ? colorConfig[color].iconColor.active 
                : colorConfig[color].iconColor.base
            )} 
          />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && isHovered && !isDisabled && (
            <motion.div
              initial={{ opacity: 0, y: tooltipPosition === "top" ? 4 : tooltipPosition === "bottom" ? -4 : 0, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: tooltipPosition === "top" ? 4 : tooltipPosition === "bottom" ? -4 : 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-[100] px-2 py-1 text-xs font-medium rounded shadow-lg whitespace-nowrap pointer-events-none",
                "text-white bg-[#0F3455]",
                tooltipPositionConfig[tooltipPosition]
              )}
              style={{ color: '#FFFFFF' }}
            >
              <span style={{ color: '#FFFFFF' }}>{tooltip}</span>
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

ButtonUtility.displayName = "ButtonUtility";
