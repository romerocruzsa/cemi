// src/components/base/select/select.tsx
// Enhanced Select with label, hint, and rich items - similar to UntitledUI's Select

import React, { forwardRef, createContext, useContext } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../ui/utils";
import { Check, ChevronDown, HelpCircle, LucideIcon } from "lucide-react";
import { Avatar } from "../avatar/avatar-label-group";

// ============================================================================
// Types
// ============================================================================
export interface SelectItem {
  id: string;
  label: string;
  supportingText?: string;
  icon?: LucideIcon;
  avatarUrl?: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectPrimitive.SelectProps, "children"> {
  /** Label text above the select */
  label?: string;
  /** Hint text below the select */
  hint?: string;
  /** Tooltip for the label */
  tooltip?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  isRequired?: boolean;
  /** Whether the select is disabled */
  isDisabled?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Items to render */
  items?: SelectItem[];
  /** Custom render function for items */
  children?: (item: SelectItem) => React.ReactNode;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Context
// ============================================================================
const SelectContext = createContext<{ size: "sm" | "md" | "lg" }>({ size: "md" });

// ============================================================================
// Main Select Component
// ============================================================================
const SelectRoot = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      hint,
      tooltip,
      placeholder = "Select an option",
      error,
      isRequired = false,
      isDisabled = false,
      size = "md",
      items = [],
      children,
      className,
      ...props
    },
    ref
  ) => {
    const sizeConfig = {
      sm: { trigger: "h-8 text-xs px-8", label: "text-xs", hint: "text-xs" },
      md: { trigger: "h-9 text-sm px-8", label: "text-sm", hint: "text-xs" },
      lg: { trigger: "h-10 text-sm px-8", label: "text-sm", hint: "text-sm" },
    };

    return (
      <SelectContext.Provider value={{ size }}>
        <div className={cn("flex flex-col gap-1.5", className)}>
          {/* Label */}
          {label && (
            <div className="flex items-center gap-1">
              <label className={cn("font-medium text-[#0F3455]", sizeConfig[size].label)}>
                {label}
                {isRequired && <span className="text-[#C1272D] ml-0.5">*</span>}
              </label>
              {tooltip && (
                <button
                  type="button"
                  className="text-[rgba(15,52,85,0.4)] hover:text-[rgba(15,52,85,0.6)]"
                  title={tooltip}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Select */}
          <SelectPrimitive.Root disabled={isDisabled} {...props}>
            <SelectPrimitive.Trigger
              ref={ref}
              className={cn(
                "inline-flex items-center justify-between gap-2 rounded-md border bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[#0F3455]/20",
                error
                  ? "border-[#C1272D] focus:ring-[#C1272D]/20"
                  : "border-[rgba(15,52,85,0.2)] hover:border-[rgba(15,52,85,0.3)]",
                isDisabled && "opacity-50 cursor-not-allowed bg-[rgba(15,52,85,0.02)]",
                sizeConfig[size].trigger
              )}
            >
              <SelectPrimitive.Value placeholder={placeholder} />
              <SelectPrimitive.Icon>
                <ChevronDown className="h-4 w-4 text-[rgba(15,52,85,0.5)]" />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
              <SelectPrimitive.Content
                className={cn(
                  "z-50 min-w-[180px] overflow-hidden rounded-md bg-white border border-[rgba(15,52,85,0.1)] shadow-lg",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                )}
                position="popper"
                sideOffset={4}
              >
                <SelectPrimitive.Viewport className="p-1">
                  {items.map((item) =>
                    children ? (
                      children(item)
                    ) : (
                      <SelectItem
                        key={item.id}
                        id={item.id}
                        supportingText={item.supportingText}
                        icon={item.icon}
                        avatarUrl={item.avatarUrl}
                        isDisabled={item.disabled}
                      >
                        {item.label}
                      </SelectItem>
                    )
                  )}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
          </SelectPrimitive.Root>

          {/* Hint or Error */}
          {(hint || error) && (
            <span
              className={cn(
                sizeConfig[size].hint,
                error ? "text-[#C1272D]" : "text-[rgba(15,52,85,0.5)]"
              )}
            >
              {error || hint}
            </span>
          )}
        </div>
      </SelectContext.Provider>
    );
  }
);
SelectRoot.displayName = "Select";

// ============================================================================
// Select Item
// ============================================================================
interface SelectItemProps extends SelectPrimitive.SelectItemProps {
  supportingText?: string;
  icon?: LucideIcon;
  avatarUrl?: string;
  isDisabled?: boolean;
  id: string;
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, supportingText, icon: Icon, avatarUrl, isDisabled, id, ...props }, ref) => {
    const { size } = useContext(SelectContext);
    
    const sizeConfig = {
      sm: "py-1.5 px-8 text-xs",
      md: "py-2 px-8 text-sm",
      lg: "py-2.5 px-8 text-sm",
    };

    return (
      <SelectPrimitive.Item
        ref={ref}
        value={id}
        disabled={isDisabled}
        className={cn(
          "relative flex items-center gap-2 cursor-pointer select-none outline-none rounded transition-colors",
          "text-[#0F3455] focus:bg-[rgba(15,52,85,0.05)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
          sizeConfig[size],
          className
        )}
        {...props}
      >
        {/* Avatar or Icon */}
        {avatarUrl && <Avatar src={avatarUrl} size="xs" />}
        {Icon && !avatarUrl && <Icon className="h-4 w-4 flex-shrink-0 text-[rgba(15,52,85,0.5)]" />}

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <SelectPrimitive.ItemText className="block truncate">
            {children}
          </SelectPrimitive.ItemText>
          {supportingText && (
            <span className="block text-xs text-[rgba(15,52,85,0.5)] truncate">
              {supportingText}
            </span>
          )}
        </div>

        {/* Check indicator */}
        <SelectPrimitive.ItemIndicator className="flex-shrink-0">
          <Check className="h-4 w-4 text-[#0F3455]" />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
  }
);
SelectItem.displayName = "Select.Item";

// ============================================================================
// Select Group
// ============================================================================
const SelectGroup = forwardRef<HTMLDivElement, SelectPrimitive.SelectGroupProps>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Group ref={ref} className={cn("py-1", className)} {...props} />
  )
);
SelectGroup.displayName = "Select.Group";

// ============================================================================
// Select Label (for groups)
// ============================================================================
const SelectLabel = forwardRef<HTMLDivElement, SelectPrimitive.SelectLabelProps>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("px-8 py-1.5 text-xs font-medium text-[rgba(15,52,85,0.5)]", className)}
      {...props}
    />
  )
);
SelectLabel.displayName = "Select.Label";

// ============================================================================
// Select Separator
// ============================================================================
const SelectSeparator = forwardRef<HTMLDivElement, SelectPrimitive.SelectSeparatorProps>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("h-px my-1 bg-[rgba(15,52,85,0.1)]", className)}
      {...props}
    />
  )
);
SelectSeparator.displayName = "Select.Separator";

// ============================================================================
// Export with subcomponents
// ============================================================================
export const Select = Object.assign(SelectRoot, {
  Item: SelectItem,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
});
