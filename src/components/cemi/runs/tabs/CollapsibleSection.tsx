// src/components/cemi/runs/tabs/CollapsibleSection.tsx

import React, { useState } from "react";
import { Badge } from "../../../ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  count,
  defaultExpanded = true,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`border-b border-[rgba(15,52,85,0.1)] last:border-0 ${className}`}>
      {/* Section header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 px-2 hover:bg-[rgba(15,52,85,0.02)] transition-colors group"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[rgba(15,52,85,0.6)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[rgba(15,52,85,0.6)]" />
          )}
          <span className="text-sm font-medium text-[#0F3455]">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {count}
            </Badge>
          )}
        </div>
      </button>

      {/* Section body */}
      {isExpanded && (
        <div className="px-2 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
