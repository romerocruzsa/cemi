import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Run } from "../../../types/cemi";
import { StatusPill } from "./StatusPill";
import { TargetProfileChip } from "./TargetProfileChip";

interface RunTableProps {
  runs: Run[];
  onRunClick?: (run: Run) => void;
  className?: string;
}

type SortField = "timestamp" | "method" | "status" | "dataset_name";
type SortDirection = "asc" | "desc";

export function RunTable({ runs, onRunClick, className }: RunTableProps) {
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedRuns = [...runs].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "timestamp":
        aValue = a.timestamp;
        bValue = b.timestamp;
        break;
      case "method":
        aValue = a.method;
        bValue = b.method;
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "dataset_name":
        aValue = a.dataset_name;
        bValue = b.dataset_name;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-[#D82A2D] transition-colors"
      >
        {children}
        {sortField === field && (
          <span className="text-xs">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    </TableHead>
  );

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="method">Method</SortableHeader>
            <TableHead>Quantization</TableHead>
            <SortableHeader field="dataset_name">Dataset</SortableHeader>
            <TableHead>Models</TableHead>
            <TableHead>Target Profile</TableHead>
            <SortableHeader field="status">Status</SortableHeader>
            <SortableHeader field="timestamp">Timestamp</SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRuns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[#0F3455]/70">
                No runs found
              </TableCell>
            </TableRow>
          ) : (
            sortedRuns.map((run) => (
              <TableRow
                key={run.id}
                onClick={() => onRunClick?.(run)}
                className={onRunClick ? "cursor-pointer hover:bg-[#0F3455]/5" : ""}
              >
                <TableCell className="font-medium">{run.method}</TableCell>
                <TableCell>{run.quantization}</TableCell>
                <TableCell>{run.dataset_name}</TableCell>
                <TableCell>{run.num_models}</TableCell>
                <TableCell>
                  <TargetProfileChip profile={run.target_profile} />
                </TableCell>
                <TableCell>
                  <StatusPill status={run.status} />
                </TableCell>
                <TableCell className="text-sm text-[#0F3455]/70">
                  {new Date(run.timestamp).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

