// src/components/ui/widget/WidgetControls.tsx

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import { Label } from "../label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Button } from "../button";
import { MoreVertical, Maximize2, Copy, Trash2 } from "lucide-react";

export interface WidgetControlsProps {
  metricSelector?: {
    value: string;
    options: string[];
    onValueChange: (value: string) => void;
    label?: string;
  };
  columnSelector?: {
    value: string[];
    options: string[];
    onValueChange: (value: string[]) => void;
    label?: string;
  };
  viewSelector?: {
    value: string;
    options: string[];
    onValueChange: (value: string) => void;
    label?: string;
  };
  toggle?: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };
  overflowMenu?: {
    onExpand?: () => void;
    onDuplicate?: () => void;
    onRemove?: () => void;
  };
}

export function WidgetControls({
  metricSelector,
  columnSelector,
  viewSelector,
  toggle,
  overflowMenu,
}: WidgetControlsProps) {
  const controls: React.ReactNode[] = [];

  // Add metric selector
  if (metricSelector) {
    controls.push(
      <Select
        key="metric"
        value={metricSelector.value}
        onValueChange={metricSelector.onValueChange}
      >
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder={metricSelector.label || "Metric"} />
        </SelectTrigger>
        <SelectContent>
          {metricSelector.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Add column selector
  if (columnSelector) {
    controls.push(
      <Select
        key="columns"
        value={columnSelector.value.join(",")}
        onValueChange={(v) => columnSelector.onValueChange(v.split(","))}
      >
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder={columnSelector.label || "Columns"} />
        </SelectTrigger>
        <SelectContent>
          {columnSelector.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Add view selector
  if (viewSelector) {
    controls.push(
      <Select
        key="view"
        value={viewSelector.value}
        onValueChange={viewSelector.onValueChange}
      >
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder={viewSelector.label || "View"} />
        </SelectTrigger>
        <SelectContent>
          {viewSelector.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Add toggle
  if (toggle) {
    controls.push(
      <div key="toggle" className="flex items-center gap-2">
        <Switch
          id={`widget-toggle-${toggle.label}`}
          checked={toggle.checked}
          onCheckedChange={toggle.onCheckedChange}
        />
        <Label
          htmlFor={`widget-toggle-${toggle.label}`}
          className="text-xs cursor-pointer"
        >
          {toggle.label}
        </Label>
      </div>
    );
  }

  // Add overflow menu (always last, max 3 visible controls)
  if (overflowMenu && controls.length < 3) {
    controls.push(
      <DropdownMenu key="overflow">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {overflowMenu.onExpand && (
            <DropdownMenuItem onClick={overflowMenu.onExpand}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Expand
            </DropdownMenuItem>
          )}
          {overflowMenu.onDuplicate && (
            <DropdownMenuItem onClick={overflowMenu.onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}
          {overflowMenu.onRemove && (
            <DropdownMenuItem onClick={overflowMenu.onRemove} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Limit to max 3 visible controls
  const visibleControls = controls.slice(0, 3);
  const hiddenControls = controls.slice(3);

  return (
    <div className="flex items-center gap-1">
      {visibleControls}
      {hiddenControls.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hiddenControls.map((control, idx) => (
              <div key={idx}>{control}</div>
            ))}
            {overflowMenu && (
              <>
                {overflowMenu.onExpand && (
                  <DropdownMenuItem onClick={overflowMenu.onExpand}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Expand
                  </DropdownMenuItem>
                )}
                {overflowMenu.onDuplicate && (
                  <DropdownMenuItem onClick={overflowMenu.onDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {overflowMenu.onRemove && (
                  <DropdownMenuItem onClick={overflowMenu.onRemove} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
