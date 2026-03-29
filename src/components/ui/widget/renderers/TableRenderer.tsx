// src/components/ui/widget/renderers/TableRenderer.tsx

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../table";
import { Button } from "../../button";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import type { TableWidgetConfig, WidgetContext } from "../types";

export interface TableDataRow {
  [key: string]: string | number | React.ReactNode;
}

export interface TableRendererProps {
  data: TableDataRow[];
  config: TableWidgetConfig;
  context: WidgetContext;
}

export function TableRenderer({ data, config, context }: TableRendererProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const maxRows = config.maxRows || 6;
  const [showAll, setShowAll] = useState(false);

  const sortedData = useMemo(() => {
    if (!sortColumn || !config.sortable) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === undefined || bVal === undefined) return 0;

      const comparison =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, config.sortable]);

  const displayData = showAll ? sortedData : sortedData.slice(0, maxRows);
  const hasMore = sortedData.length > maxRows;

  const handleSort = (column: string) => {
    if (!config.sortable) return;
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => {
    if (!config.sortable) {
      return <TableHead>{children}</TableHead>;
    }

    const isSorted = sortColumn === column;
    return (
      <TableHead
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => handleSort(column)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {children}
          {isSorted ? (
            sortDirection === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-30" />
          )}
        </div>
      </TableHead>
    );
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            {config.columns.map((column) => (
              <SortableHeader key={column} column={column}>
                {column}
              </SortableHeader>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row, idx) => (
            <TableRow key={idx}>
              {config.columns.map((column) => (
                <TableCell key={column} className="text-xs">
                  {row[column] ?? "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && !showAll && (
        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-xs"
          >
            View more ({sortedData.length - maxRows} more rows)
          </Button>
        </div>
      )}
      {showAll && hasMore && (
        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(false)}
            className="text-xs"
          >
            Show less
          </Button>
        </div>
      )}
    </div>
  );
}

