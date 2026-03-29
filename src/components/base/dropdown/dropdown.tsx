// src/components/base/dropdown/dropdown.tsx
// Enhanced dropdown with sections and separators - similar to UntitledUI's Dropdown

import React, { forwardRef, createContext, useContext } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../ui/utils";
import { Check, ChevronRight, LucideIcon } from "lucide-react";

// ============================================================================
// Context
// ============================================================================
const DropdownContext = createContext<{ size: "sm" | "md" | "lg" }>({ size: "md" });

// ============================================================================
// Root
// ============================================================================
interface DropdownRootProps extends DropdownMenuPrimitive.DropdownMenuProps {
  size?: "sm" | "md" | "lg";
}

const Root = ({ size = "md", children, ...props }: DropdownRootProps) => (
  <DropdownContext.Provider value={{ size }}>
    <DropdownMenuPrimitive.Root {...props}>{children}</DropdownMenuPrimitive.Root>
  </DropdownContext.Provider>
);

// ============================================================================
// Trigger
// ============================================================================
const Trigger = DropdownMenuPrimitive.Trigger;

// ============================================================================
// Popover (Content wrapper with animation)
// ============================================================================
interface PopoverProps extends DropdownMenuPrimitive.DropdownMenuContentProps {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  ({ className, align = "end", sideOffset = 4, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[180px] overflow-hidden rounded-lg bg-white border border-[rgba(15,52,85,0.1)] shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
);
Popover.displayName = "Dropdown.Popover";

// ============================================================================
// Menu (wrapper for items)
// ============================================================================
const Menu = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("py-1", className)} {...props}>
      {children}
    </div>
  )
);
Menu.displayName = "Dropdown.Menu";

// ============================================================================
// Section
// ============================================================================
interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ className, title, children, ...props }, ref) => (
    <div ref={ref} className={cn("py-1", className)} {...props}>
      {title && (
        <div className="px-8 py-1.5 text-xs font-medium text-[rgba(15,52,85,0.5)] uppercase tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  )
);
Section.displayName = "Dropdown.Section";

// ============================================================================
// Separator
// ============================================================================
const Separator = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn("h-px my-1 bg-[rgba(15,52,85,0.1)]", className)}
      {...props}
    />
  )
);
Separator.displayName = "Dropdown.Separator";

// ============================================================================
// Item
// ============================================================================
interface ItemProps extends DropdownMenuPrimitive.DropdownMenuItemProps {
  icon?: LucideIcon;
  addon?: React.ReactNode;
  destructive?: boolean;
}

const Item = forwardRef<HTMLDivElement, ItemProps>(
  ({ className, icon: Icon, addon, destructive = false, children, disabled, ...props }, ref) => {
    const { size } = useContext(DropdownContext);
    
    const sizeClasses = {
      sm: "px-8 py-1 text-xs",
      md: "px-8 py-2 text-sm",
      lg: "px-8 py-2.5 text-sm",
    };

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        disabled={disabled}
        className={cn(
          "relative flex items-center gap-2 cursor-pointer select-none outline-none transition-colors",
          sizeClasses[size],
          destructive
            ? "text-[#C1272D] focus:bg-[rgba(193,39,45,0.08)]"
            : "text-[#0F3455] focus:bg-[rgba(15,52,85,0.05)]",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {Icon && <Icon className={cn("h-4 w-4 flex-shrink-0", destructive ? "text-[#C1272D]" : "text-[rgba(15,52,85,0.5)]")} />}
        <span className="flex-1 truncate">{children}</span>
        {addon && (
          <span className="text-xs text-[rgba(15,52,85,0.4)] ml-auto pl-4">
            {addon}
          </span>
        )}
      </DropdownMenuPrimitive.Item>
    );
  }
);
Item.displayName = "Dropdown.Item";

// ============================================================================
// CheckboxItem
// ============================================================================
interface CheckboxItemProps extends DropdownMenuPrimitive.DropdownMenuCheckboxItemProps {
  icon?: LucideIcon;
}

const CheckboxItem = forwardRef<HTMLDivElement, CheckboxItemProps>(
  ({ className, icon: Icon, children, checked, ...props }, ref) => {
    const { size } = useContext(DropdownContext);
    
    const sizeClasses = {
      sm: "px-8 py-1 text-xs",
      md: "px-8 py-2 text-sm",
      lg: "px-8 py-2.5 text-sm",
    };

    return (
      <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        checked={checked}
        className={cn(
          "relative flex items-center gap-2 cursor-pointer select-none outline-none transition-colors",
          "text-[#0F3455] focus:bg-[rgba(15,52,85,0.05)]",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <div className="h-4 w-4 flex items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Check className="h-3.5 w-3.5 text-[#0F3455]" />
          </DropdownMenuPrimitive.ItemIndicator>
        </div>
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-[rgba(15,52,85,0.5)]" />}
        <span className="flex-1 truncate">{children}</span>
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }
);
CheckboxItem.displayName = "Dropdown.CheckboxItem";

// ============================================================================
// SubMenu
// ============================================================================
const SubMenu = DropdownMenuPrimitive.Sub;

const SubTrigger = forwardRef<HTMLDivElement, DropdownMenuPrimitive.DropdownMenuSubTriggerProps & { icon?: LucideIcon }>(
  ({ className, icon: Icon, children, ...props }, ref) => {
    const { size } = useContext(DropdownContext);
    
    const sizeClasses = {
      sm: "px-8 py-1 text-xs",
      md: "px-8 py-2 text-sm",
      lg: "px-8 py-2.5 text-sm",
    };

    return (
      <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
          "relative flex items-center gap-2 cursor-pointer select-none outline-none transition-colors",
          "text-[#0F3455] focus:bg-[rgba(15,52,85,0.05)]",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-[rgba(15,52,85,0.5)]" />}
        <span className="flex-1 truncate">{children}</span>
        <ChevronRight className="h-4 w-4 text-[rgba(15,52,85,0.4)]" />
      </DropdownMenuPrimitive.SubTrigger>
    );
  }
);
SubTrigger.displayName = "Dropdown.SubTrigger";

const SubContent = forwardRef<HTMLDivElement, DropdownMenuPrimitive.DropdownMenuSubContentProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        "z-50 min-w-[180px] overflow-hidden rounded-lg bg-white border border-[rgba(15,52,85,0.1)] shadow-lg py-1",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  )
);
SubContent.displayName = "Dropdown.SubContent";

// ============================================================================
// Label
// ============================================================================
const Label = forwardRef<HTMLDivElement, DropdownMenuPrimitive.DropdownMenuLabelProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn("px-8 py-1.5 text-xs font-medium text-[rgba(15,52,85,0.5)]", className)}
      {...props}
    />
  )
);
Label.displayName = "Dropdown.Label";

// ============================================================================
// Export
// ============================================================================
export const Dropdown = {
  Root,
  Trigger,
  Popover,
  Menu,
  Section,
  Separator,
  Item,
  CheckboxItem,
  SubMenu,
  SubTrigger,
  SubContent,
  Label,
};
