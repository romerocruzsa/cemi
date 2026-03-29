// src/components/ui/widget/renderers/TextViewerRenderer.tsx

import React, { useState, useMemo } from "react";
import { Input } from "../../input";
import { Button } from "../../button";
import { CopyButton } from "../../copy-button";
import { Search } from "lucide-react";
import type { TextWidgetConfig, WidgetContext } from "../types";

export interface TextViewerRendererProps {
  data: string;
  config: TextWidgetConfig;
  context: WidgetContext;
}

export function TextViewerRenderer({
  data,
  config,
  context,
}: TextViewerRendererProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const highlightedText = useMemo(() => {
    if (!searchQuery || !config.searchable) {
      return data;
    }

    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = data.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="bg-yellow-200 dark:bg-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, [data, searchQuery, config.searchable]);

  const fontFamily =
    config.contentType === "json" || config.contentType === "log"
      ? "monospace"
      : "inherit";

  return (
    <div className="flex flex-col h-full">
      {config.searchable && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <CopyButton text={data} size="sm" />
        </div>
      )}
      <div
        className="flex-1 overflow-auto p-2 text-xs border rounded"
        style={{
          fontFamily,
          whiteSpace: config.contentType === "json" ? "pre" : "pre-wrap",
          maxHeight: "400px",
        }}
      >
        {highlightedText}
      </div>
    </div>
  );
}

