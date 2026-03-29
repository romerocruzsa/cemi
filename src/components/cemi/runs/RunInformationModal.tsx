// src/components/cemi/runs/RunInformationModal.tsx

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { CopyButton } from "../../ui/copy-button";
import { X, Plus } from "lucide-react";
import type { RunRecord } from "../../../types/domain";

interface RunInformationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: RunRecord | null;
  onSave?: (runId: string, updates: { description?: string; tags?: string[] }) => void;
}

export function RunInformationModal({
  open,
  onOpenChange,
  run,
  onSave,
}: RunInformationModalProps) {
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Reset form when run changes; prefer run.description, fall back to description tag
  useEffect(() => {
    if (run) {
      const desc =
        (typeof run.description === "string" && run.description.trim()) ||
        run.tags.find((t) => t.key === "description")?.value ||
        "";
      setDescription(desc);
      setTags(run.tags.filter((t) => t.key !== "description").map((t) => t.value));
    }
  }, [run]);

  if (!run) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(run.id, { description, tags });
    }
    onOpenChange(false);
  };

  const getStatusColor = (status: RunRecord["status"]) => {
    const colors: Record<string, string> = {
      succeeded: "bg-green-100 text-green-800",
      running: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Run Information</DialogTitle>
          <DialogDescription>
            View and edit run metadata. Saving run info is not available yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Run Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Run Name</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{run.name || "Unnamed Run"}</span>
              <Badge className={getStatusColor(run.status)}>{run.status}</Badge>
            </div>
          </div>

          {/* Experiment Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Experiment</Label>
            <p className="text-sm text-[rgba(15,52,85,0.7)]">
              {run.tags.find((t) => t.key === "experiment")?.value || "Default Experiment"}
            </p>
          </div>

          {/* Run ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Run ID</Label>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-[rgba(15,52,85,0.05)] px-2 py-1 rounded font-mono">
                {run.id}
              </code>
              <CopyButton text={run.id} size="icon" variant="ghost" className="h-6 w-6" />
            </div>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Owner</Label>
            <p className="text-sm text-[rgba(15,52,85,0.7)]">{run.owner || "Unknown"}</p>
          </div>

          {/* Creation Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Created</Label>
            <p className="text-sm text-[rgba(15,52,85,0.7)]">
              {run.created_at
                ? new Date(run.created_at).toLocaleString()
                : "Unknown"}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this run..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-[rgba(15,52,85,0.1)] rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-[rgba(15,52,85,0.5)]">No tags</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled title="Saving run info is not available yet.">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




