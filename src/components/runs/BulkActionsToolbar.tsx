import React from "react";
import { GitCompare, Trash2, Tag, MoreVertical } from "lucide-react";
import { theme } from "../../theme";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onCompare?: () => void;
  onDelete?: () => void;
  onTag?: () => void;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onCompare,
  onDelete,
  onTag,
  onClearSelection,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.375rem 0.5rem",
        backgroundColor: "rgba(15, 52, 85, 0.05)",
        borderBottom: "1px solid rgba(15, 52, 85, 0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.875rem", color: "#0F3455", fontWeight: 500 }}>
          {selectedCount} {selectedCount === 1 ? "run" : "runs"} selected
        </span>
        <button
          onClick={onClearSelection}
          style={{
            padding: "0.125rem 0.25rem",
            fontSize: "0.75rem",
            color: "rgba(15, 52, 85, 0.7)",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Clear
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {onCompare && (
          <button
            onClick={onCompare}
            disabled={selectedCount < 2}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.875rem",
              color: selectedCount >= 2 ? "#0F3455" : "rgba(15, 52, 85, 0.4)",
              backgroundColor: theme.colors.beige.lighter,
              border: "1px solid rgba(15, 52, 85, 0.2)",
              cursor: selectedCount >= 2 ? "pointer" : "not-allowed",
              fontWeight: 500,
            }}
          >
            <GitCompare style={{ width: "1rem", height: "1rem" }} />
            Compare
          </button>
        )}
        {onTag && (
          <button
            onClick={onTag}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.875rem",
              color: "#0F3455",
              backgroundColor: theme.colors.beige.lighter,
              border: "1px solid rgba(15, 52, 85, 0.2)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <Tag style={{ width: "1rem", height: "1rem" }} />
            Tag
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.875rem",
              color: "#D82A2D",
              backgroundColor: theme.colors.beige.lighter,
              border: "1px solid rgba(216, 42, 45, 0.2)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <Trash2 style={{ width: "1rem", height: "1rem" }} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

