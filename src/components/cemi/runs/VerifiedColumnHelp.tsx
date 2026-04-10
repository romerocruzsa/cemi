// src/components/cemi/runs/VerifiedColumnHelp.tsx

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { animationPresets, shadowPresets } from "../../ui/animated-interactive";
import { useWorkspaceTheme } from "../../../contexts/WorkspaceThemeContext";

/** Info control that opens a modal explaining the Verified column. Uses `<dialog>` in the top layer + portal so table/tbody stacking never blocks clicks. */
export function VerifiedColumnHelp() {
  const { surfaceBg } = useWorkspaceTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelOpenRef = useRef(false);
  const [bodyReady, setBodyReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useLayoutEffect(() => {
    setBodyReady(true);
  }, []);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  const beginClose = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const open = () => {
    const el = dialogRef.current;
    if (!el) return;
    if (!el.open) el.showModal();
    setPanelOpen(true);
  };

  const handlePanelAnimationComplete = useCallback(() => {
    if (!panelOpenRef.current) {
      dialogRef.current?.close();
    }
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      beginClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [bodyReady, beginClose]);

  const dialogNode = (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[200] w-[min(100vw-2rem,28rem)] max-h-[min(85vh,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-visible border-0 bg-transparent p-0 shadow-none [&::backdrop]:bg-black/50"
      style={{ backgroundColor: "transparent" }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === dialogRef.current) beginClose();
      }}
    >
      {/* Opaque shell paints immediately so UA dialog white / low-opacity motion never flashes through */}
      <div
        className="max-h-[min(85vh,40rem)] overflow-y-auto rounded-lg border border-[rgba(15,52,85,0.12)]"
        style={{ backgroundColor: surfaceBg, boxShadow: shadowPresets.lg }}
      >
        <motion.div
          className="p-6 text-[rgba(15,52,85,0.85)]"
          initial={{ opacity: 0, y: 10 }}
          animate={
            panelOpen
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: -10 }
          }
          transition={animationPresets.spring}
          onAnimationComplete={handlePanelAnimationComplete}
        >
          <div className="flex items-start gap-3">
            <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-[#0F3455]">
              What does &quot;Verified&quot; mean?
            </h2>
            <motion.button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[rgba(15,52,85,0.55)] transition-colors hover:bg-[rgba(15,52,85,0.08)] hover:text-[#0F3455]"
              aria-label="Close"
              onClick={beginClose}
              whileTap={{ scale: 0.998 }}
              transition={animationPresets.spring}
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
          <div className="mt-4 space-y-3 text-sm text-[rgba(15,52,85,0.75)]">
            <p>
              A run is <strong className="text-[#0F3455]">Verified</strong> when it has been checked
              against a contract — a set of minimum requirements your model must meet before it is
              considered ready to deploy.
            </p>
            <p>
              Each requirement is called a <strong className="text-[#0F3455]">gate</strong>. A gate
              might say: &quot;accuracy must be at least 90%&quot; or &quot;inference latency must stay
              under 20 ms.&quot; The run&apos;s recorded values are compared against every gate.
            </p>
            <ul className="space-y-1 pl-4 list-disc">
              <li>
                <span className="font-semibold text-green-700">✓ PASS</span> — every gate was satisfied.
              </li>
              <li>
                <span className="font-semibold text-red-700">✗ FAIL</span> — at least one gate was not
                met.
              </li>
              <li>
                <span className="text-[rgba(15,52,85,0.5)]">—</span> — the run has not been verified
                yet.
              </li>
            </ul>
            <p>
              Verification is run with{" "}
              <code className="rounded bg-[rgba(15,52,85,0.06)] px-1 py-0.5 font-mono text-xs">
                cemi verify
              </code>{" "}
              and the full gate-by-gate breakdown is visible in the run&apos;s Results tab.
            </p>
          </div>
        </motion.div>
      </div>
    </dialog>
  );

  return (
    <>
      <motion.button
        type="button"
        className="relative z-[60] inline-flex h-8 min-h-8 w-8 min-w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[rgba(15,52,85,0.45)] transition-colors hover:bg-[rgba(15,52,85,0.08)] hover:text-[#0F3455]"
        aria-label="What does Verified mean?"
        aria-haspopup="dialog"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        whileTap={{ scale: 0.998 }}
        transition={animationPresets.spring}
      >
        <Info className="pointer-events-none h-3 w-3" aria-hidden />
      </motion.button>
      {bodyReady ? createPortal(dialogNode, document.body) : null}
    </>
  );
}
