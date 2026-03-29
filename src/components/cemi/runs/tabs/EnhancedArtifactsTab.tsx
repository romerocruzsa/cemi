// src/components/cemi/runs/tabs/EnhancedArtifactsTab.tsx

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Badge } from "../../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";
import { Download, Search, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import type { RunRecord, ArtifactType } from "../../../../types/domain";

interface EnhancedArtifactsTabProps {
  run: RunRecord;
}

type SortField = "name" | "type" | "size" | "created_at";
type SortDirection = "asc" | "desc";

export function EnhancedArtifactsTab({ run }: EnhancedArtifactsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ArtifactType | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedArtifacts = useMemo(() => {
    let filtered = run.artifacts.filter((artifact) => {
      const matchesSearch =
        searchQuery === "" ||
        artifact.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || artifact.type === typeFilter;
      return matchesSearch && matchesType;
    });

    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "size":
          aValue = a.size_bytes || 0;
          bValue = b.size_bytes || 0;
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [run.artifacts, searchQuery, typeFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isSorted = sortField === field;
    return (
      <TableHead
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => handleSort(field)}
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

  const formatSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const artifactTypes: ArtifactType[] = ["config", "results", "model", "log", "profile", "report", "other"];

  const artifactRowKey = (artifact: any, idx: number) =>
    String(artifact?.id ?? artifact?.uri ?? artifact?.url ?? artifact?.name ?? idx);

  const artifactCreatedAtLabel = (artifact: any) => {
    const raw = artifact?.created_at;
    if (!raw) return "Unknown";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString();
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ position: "relative" }}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50" />
                <Input
                  placeholder="Search artifacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                />
              </div>
            </div>
            <div style={{ minWidth: "150px" }}>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {artifactTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Artifacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Artifacts ({filteredAndSortedArtifacts.length} of {run.artifacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedArtifacts.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "rgba(15, 52, 85, 0.7)" }}>
              {run.artifacts.length === 0
                ? "No artifacts available for this run."
                : "No artifacts match the current filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name">Name</SortableHeader>
                  <SortableHeader field="type">Type</SortableHeader>
                  <SortableHeader field="size">Size</SortableHeader>
                  <SortableHeader field="created_at">Created</SortableHeader>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedArtifacts.map((artifact, idx) => (
                  <TableRow key={artifactRowKey(artifact, idx)}>
                    <TableCell style={{ fontWeight: 500 }}>{artifact.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{artifact.type}</Badge>
                    </TableCell>
                    <TableCell>{formatSize(artifact.size_bytes)}</TableCell>
                    <TableCell>
                      {artifactCreatedAtLabel(artifact)}
                    </TableCell>
                    <TableCell>
                      {(artifact.uri || (artifact as any).url) && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={artifact.uri || (artifact as any).url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


