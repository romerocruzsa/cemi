import React, { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "../../../ui/scroll-area";
import type { NetronGraphSummary, NetronViewerHandle, NetronNodeSummary } from "./netron/NetronViewer";

type TreeItem =
  | { kind: "folder"; name: string; path: string; children: TreeItem[] }
  | { kind: "node"; id: string; name: string; opType: string; path: string };

function nodeLabel(n: NetronNodeSummary) {
  const base = n.name?.trim() ? n.name.trim() : `(unnamed) ${n.opType || "Node"}`;
  return base;
}

function splitIntoPathSegments(n: NetronNodeSummary): string[] {
  const name = (n.name || "").trim();
  if (!name) return ["(unnamed)"];
  if (name.includes("/")) return name.split("/").filter(Boolean);
  if (name.includes(".")) return name.split(".").filter(Boolean);
  if (name.includes("_")) return name.split("_").filter(Boolean);
  return [name];
}

function insertIntoTree(root: TreeItem & { kind: "folder" }, leaf: NetronNodeSummary) {
  const segments = splitIntoPathSegments(leaf);
  let cursor = root;
  const parts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    parts.push(seg);
    const path = parts.join("/");
    const isLast = i === segments.length - 1;

    if (isLast) {
      cursor.children.push({
        kind: "node",
        id: leaf.id,
        name: nodeLabel(leaf),
        opType: leaf.opType,
        path,
      });
      return;
    }

    let folder = cursor.children.find((c) => c.kind === "folder" && c.name === seg) as
      | (TreeItem & { kind: "folder" })
      | undefined;
    if (!folder) {
      folder = { kind: "folder", name: seg, path, children: [] };
      cursor.children.push(folder);
    }
    cursor = folder;
  }
}

function sortTree(item: TreeItem): TreeItem {
  if (item.kind === "node") return item;
  const children = item.children.map(sortTree);
  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { ...item, children };
}

export function ModelNavigatorMVP({
  viewerRef,
  selectedNodeId,
  onSelectNodeId,
}: {
  viewerRef: React.RefObject<NetronViewerHandle | null>;
  selectedNodeId: string | null;
  onSelectNodeId: (id: string) => void;
}) {
  const [summary, setSummary] = useState<NetronGraphSummary>({ graphs: [] });
  const [query, setQuery] = useState("");
  const [navPath, setNavPath] = useState<string[]>([]);

  // Poll the viewer for a graph summary (MVP: keep it simple).
  useEffect(() => {
    let alive = true;
    const tick = () => {
      const next = viewerRef.current?.getGraphSummary?.() || { graphs: [] };
      if (alive) setSummary(next);
    };
    tick();
    const id = window.setInterval(tick, 600);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [viewerRef]);

  const activeGraph = summary.graphs[0] || null;
  const baseTree = useMemo(() => {
    // Root is virtual; we don't render it. We render directly from graph contents.
    const root: TreeItem & { kind: "folder" } = {
      kind: "folder",
      name: activeGraph?.name || "main",
      path: "",
      children: [],
    };

    for (const n of activeGraph?.nodes || []) {
      insertIntoTree(root, n);
    }
    return sortTree(root);
  }, [activeGraph]);

  // Reset navigation when graph changes.
  useEffect(() => {
    setNavPath([]);
  }, [activeGraph?.name]);

  const rootFolder = baseTree.kind === "folder" ? baseTree : null;
  const currentFolder = useMemo(() => {
    if (!rootFolder) return null;
    let cursor: TreeItem = rootFolder;
    for (const seg of navPath) {
      if (cursor.kind !== "folder") return null;
      const next = cursor.children.find((c) => c.kind === "folder" && c.name === seg) || null;
      if (!next) return null;
      cursor = next;
    }
    return cursor.kind === "folder" ? cursor : null;
  }, [rootFolder, navPath]);

  const visibleChildren = useMemo(() => {
    const folder = currentFolder;
    if (!folder) return [];
    const children = folder.children;
    if (!query.trim()) return children;
    // MVP search: filter within current folder only.
    const q = query.trim().toLowerCase();
    return children.filter((c) => {
      if (c.kind === "folder") return c.name.toLowerCase().includes(q);
      return `${c.name} ${c.opType}`.toLowerCase().includes(q);
    });
  }, [currentFolder, query]);

  const breadcrumb = useMemo(() => {
    const rootName = activeGraph?.name || "main";
    return [rootName, ...navPath];
  }, [activeGraph?.name, navPath]);

  return (
    <div className="h-full w-full flex flex-col bg-[#F9F5EA] text-left">
      {/* Bare top bar: Back + breadcrumbs; search below */}
      <div className="border-b border-[rgba(15,52,85,0.10)] px-2 py-1 bg-[#EDE9DE]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setNavPath((p) => (p.length ? p.slice(0, -1) : p))}
            disabled={navPath.length === 0}
            className={[
              "h-6 w-6 text-xs font-medium",
              navPath.length === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-[rgba(15,52,85,0.04)]",
            ].join(" ")}
            aria-label="Back"
          >
            {"<"}
          </button>

          <div className="flex-1 min-w-0 text-xs text-[rgba(15,52,85,0.75)] truncate">
            {breadcrumb.join(" / ")}
          </div>
        </div>

        <div className="pt-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-6 w-full rounded border border-[rgba(15,52,85,0.12)] bg-[#F9F5EA] px-2 text-xs text-[#0F3455] focus:outline-none focus:ring-2 focus:ring-[rgba(216,42,45,0.18)]"
          />
        </div>
      </div>

      {/* Bare list (ScrollArea for reliable scrolling + visible thumb) */}
      <ScrollArea className="flex-1 min-h-0 bg-[#F9F5EA]">
        {!activeGraph ? (
          <div className="p-3 text-xs text-[rgba(15,52,85,0.6)]">Load a model to browse nodes.</div>
        ) : !currentFolder ? (
          <div className="p-3 text-xs text-[rgba(15,52,85,0.6)]">Navigator not ready.</div>
        ) : visibleChildren.length === 0 ? (
          <div className="p-3 text-xs text-[rgba(15,52,85,0.6)]">No items.</div>
        ) : (
          <div className="w-full">
            {visibleChildren.map((item) => {
              const isFolder = item.kind === "folder";
              const isSelected = !isFolder && selectedNodeId === item.id;
              const key = isFolder ? `folder-${item.path}-${item.name}` : item.id;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (isFolder) {
                      setNavPath((p) => [...p, item.name]);
                      return;
                    }
                    viewerRef.current?.selectNode?.(item.id);
                    onSelectNodeId(item.id);
                  }}
                  className={[
                    "w-full text-left",
                    "grid grid-cols-[1fr_18px] items-center gap-2",
                    "px-2 py-1",
                    "border-b border-[rgba(15,52,85,0.04)] last:border-b-0",
                    isSelected ? "bg-[rgba(216,42,45,0.08)] text-[#D82A2D]" : "text-[#0F3455] hover:bg-[rgba(15,52,85,0.04)]",
                  ].join(" ")}
                  title={isFolder ? item.name : `${item.name} (${item.opType})`}
                >
                  <div className="min-w-0 truncate text-xs">
                    <span className="font-medium">{item.name}</span>
                    {!isFolder ? (
                      <span className="ml-2 text-[rgba(15,52,85,0.55)]">
                        {item.opType || "Node"}
                      </span>
                    ) : null}
                  </div>
                  {/* <div className="text-[rgba(15,52,85,0.35)] text-xs text-right">{isFolder ? ">" : ""}</div> */}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}



