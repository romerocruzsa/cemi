// src/components/cemi/runs/tabs/NotesTab.tsx

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { Checkbox } from "../../../ui/checkbox";
import { Label } from "../../../ui/label";
import type { RunRecord } from "../../../../types/domain";

interface NotesTabProps {
  run: RunRecord;
  onSaveNotes?: (runId: string, notes: string) => void;
  onSaveDescription?: (runId: string, description: string) => void;
  onToggleShipCandidate?: (runId: string, isCandidate: boolean) => void;
}

export function NotesTab({
  run,
  onSaveNotes,
  onSaveDescription,
  onToggleShipCandidate,
}: NotesTabProps) {
  const [description, setDescription] = useState(
    (run as any).description || ""
  );
  const [notes, setNotes] = useState(run.notes || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isShipCandidate, setIsShipCandidate] = useState(
    (run as any).ship_candidate || false
  );

  const handleSaveDescription = () => {
    if (onSaveDescription) {
      onSaveDescription(run.id, description);
    }
    setIsEditingDescription(false);
  };

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(run.id, notes);
    }
    setIsEditingNotes(false);
  };

  const handleToggleShipCandidate = (checked: boolean) => {
    setIsShipCandidate(checked);
    if (onToggleShipCandidate) {
      onToggleShipCandidate(run.id, checked);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Description */}
      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>Description</CardTitle>
            {!isEditingDescription && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingDescription ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this run..."
                style={{ minHeight: "100px" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button size="sm" onClick={handleSaveDescription}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingDescription(false);
                    setDescription((run as any).description || "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p style={{ color: description ? "#0F3455" : "rgba(15, 52, 85, 0.5)", whiteSpace: "pre-wrap" }}>
              {description || "No description added."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes / Decision Log */}
      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>Notes / Decision Log</CardTitle>
            {!isEditingNotes && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this run, decisions made, or why this configuration was chosen..."
                style={{ minHeight: "150px" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button size="sm" onClick={handleSaveNotes}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingNotes(false);
                    setNotes(run.notes || "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p style={{ color: notes ? "#0F3455" : "rgba(15, 52, 85, 0.5)", whiteSpace: "pre-wrap" }}>
              {notes || "No notes added."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ship Candidate */}
      <Card>
        <CardHeader>
          <CardTitle>Ship Candidate</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Checkbox
              checked={isShipCandidate}
              onCheckedChange={handleToggleShipCandidate}
            />
            <Label htmlFor="ship-candidate" style={{ cursor: "pointer" }}>
              Mark as ship candidate
            </Label>
          </div>
          <p style={{ fontSize: "0.875rem", color: "rgba(15, 52, 85, 0.7)", marginTop: "0.5rem" }}>
            Mark this run as a candidate for production deployment.
          </p>
        </CardContent>
      </Card>

      {/* Approvals (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: "0.875rem", color: "rgba(15, 52, 85, 0.7)" }}>
            Approval workflow not yet available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


