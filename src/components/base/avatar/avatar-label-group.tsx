// src/components/base/avatar/avatar-label-group.tsx
// Avatar with label and subtitle - similar to UntitledUI's AvatarLabelGroup

import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../ui/utils";

export type AvatarStatus = "online" | "offline" | "away" | "busy" | "none";

export interface AvatarLabelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Primary text (name) */
  title?: string;
  /** Secondary text (email, role, etc.) */
  subtitle?: string;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Online/offline status indicator */
  status?: AvatarStatus;
  /** Fallback initials when no image */
  fallback?: string;
  /** Click handler for avatar */
  onAvatarClick?: () => void;
}

const sizeConfig = {
  xs: { avatar: "h-6 w-6", status: "h-1.5 w-1.5", title: "text-xs", subtitle: "text-[10px]", gap: "gap-1.5" },
  sm: { avatar: "h-8 w-8", status: "h-2 w-2", title: "text-sm", subtitle: "text-xs", gap: "gap-2" },
  md: { avatar: "h-10 w-10", status: "h-2.5 w-2.5", title: "text-sm", subtitle: "text-xs", gap: "gap-3" },
  lg: { avatar: "h-12 w-12", status: "h-3 w-3", title: "text-base", subtitle: "text-sm", gap: "gap-3" },
  xl: { avatar: "h-14 w-14", status: "h-3.5 w-3.5", title: "text-lg", subtitle: "text-sm", gap: "gap-4" },
};

const statusColors: Record<AvatarStatus, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  none: "",
};

export const AvatarLabelGroup = forwardRef<HTMLDivElement, AvatarLabelGroupProps>(
  (
    {
      src,
      alt,
      title,
      subtitle,
      size = "md",
      status = "none",
      fallback,
      onAvatarClick,
      className,
      ...props
    },
    ref
  ) => {
    const config = sizeConfig[size];
    
    // Generate fallback initials from title
    const initials = fallback || (title
      ? title
          .split(" ")
          .map((word) => word[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?");

    return (
      <div
        ref={ref}
        className={cn("flex items-center", config.gap, className)}
        {...props}
      >
        {/* Avatar */}
        <motion.div
          className="relative flex-shrink-0"
          whileHover={onAvatarClick ? { scale: 1.05 } : {}}
          whileTap={onAvatarClick ? { scale: 0.95 } : {}}
          onClick={onAvatarClick}
          style={{ cursor: onAvatarClick ? "pointer" : "default" }}
        >
          {src ? (
            <img
              src={src}
              alt={alt || title || "Avatar"}
              className={cn(
                "rounded-full object-cover bg-[rgba(15,52,85,0.1)]",
                config.avatar
              )}
            />
          ) : (
            <div
              className={cn(
                "rounded-full bg-[#0F3455] text-white flex items-center justify-center font-medium",
                config.avatar,
                size === "xs" && "text-[10px]",
                size === "sm" && "text-xs",
                size === "md" && "text-sm",
                size === "lg" && "text-base",
                size === "xl" && "text-lg"
              )}
            >
              {initials}
            </div>
          )}

          {/* Status indicator */}
          {status !== "none" && (
            <span
              className={cn(
                "absolute bottom-0 right-0 rounded-full border-2 border-white",
                config.status,
                statusColors[status]
              )}
            />
          )}
        </motion.div>

        {/* Text content */}
        {(title || subtitle) && (
          <div className="flex flex-col min-w-0">
            {title && (
              <span
                className={cn(
                  "font-medium text-[#0F3455] truncate",
                  config.title
                )}
              >
                {title}
              </span>
            )}
            {subtitle && (
              <span
                className={cn(
                  "text-[rgba(15,52,85,0.6)] truncate",
                  config.subtitle
                )}
              >
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

AvatarLabelGroup.displayName = "AvatarLabelGroup";

// Simple Avatar component for standalone use
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: AvatarStatus;
  fallback?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, size = "md", status = "none", fallback = "?", className, ...props }, ref) => {
    const config = sizeConfig[size];

    return (
      <div ref={ref} className={cn("relative inline-flex", className)} {...props}>
        {src ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className={cn("rounded-full object-cover bg-[rgba(15,52,85,0.1)]", config.avatar)}
          />
        ) : (
          <div
            className={cn(
              "rounded-full bg-[#0F3455] text-white flex items-center justify-center font-medium",
              config.avatar,
              size === "xs" && "text-[10px]",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-base",
              size === "xl" && "text-lg"
            )}
          >
            {fallback}
          </div>
        )}
        {status !== "none" && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-white",
              config.status,
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";
