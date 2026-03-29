import React, { useMemo, useCallback, useRef, useState } from "react";
import { Play, GitCompare, LogOut, FolderOpen, Settings, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { theme } from "../../../theme";
import { Button } from "../../ui/button";

interface BottomDockProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  hasSelectedWorkspace?: boolean;
  toolThemeMode: "default" | "light";
  onToolThemeModeChange: (mode: "default" | "light") => void;
}

interface DockItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function BottomDock({
  currentPath: _currentPath,
  onNavigate,
  hasSelectedWorkspace = false,
  toolThemeMode,
  onToolThemeModeChange,
}: BottomDockProps) {
  const { logout } = useAuth();
  const mouseX = useMotionValue(Infinity);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = "/";
  }, [logout]);

  const dockItems: DockItem[] = useMemo(
    () => [
      {
        icon: <FolderOpen className="w-5 h-5" style={{ color: theme.colors.blue }} />,
        label: "Workspace",
        onClick: () => onNavigate("/workspace"),
        disabled: false,
      },
      {
        icon: (
          <Play
            className="w-5 h-5"
            style={{
              color: hasSelectedWorkspace ? theme.colors.blue : "rgba(15, 52, 85, 0.3)",
            }}
          />
        ),
        label: "Runs",
        onClick: hasSelectedWorkspace ? () => onNavigate("/workspace/runs") : () => {},
        disabled: !hasSelectedWorkspace,
      },
      {
        icon: (
          <GitCompare
            className="w-5 h-5"
            style={{
              color: hasSelectedWorkspace ? theme.colors.blue : "rgba(15, 52, 85, 0.3)",
            }}
          />
        ),
        label: "Compare",
        onClick: hasSelectedWorkspace ? () => onNavigate("/workspace/compare") : () => {},
        disabled: !hasSelectedWorkspace,
      },
      {
        icon: (
          <Settings
            className="w-5 h-5"
            style={{
              color: theme.colors.blue,
            }}
          />
        ),
        label: "Settings",
        onClick: () => setIsSettingsOpen(true),
        disabled: false,
      },
      {
        icon: <LogOut className="w-5 h-5" style={{ color: theme.colors.red }} />,
        label: "Logout",
        onClick: handleLogout,
        disabled: false,
      },
    ],
    [onNavigate, handleLogout, hasSelectedWorkspace]
  );

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
        <motion.div
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="flex items-end gap-2 border px-3 pb-2 pt-1"
          style={{
            borderRadius: "15px",
            overflow: "visible",
            backgroundColor: "var(--cemi-dock-bg, rgba(249, 245, 234, 0.88))",
            borderColor: "rgba(15, 52, 85, 0.16)",
            boxShadow:
              "0 18px 42px rgba(15, 52, 85, 0.12), 0 6px 16px rgba(15, 52, 85, 0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          {dockItems.map((item) =>
            React.createElement(DockItemComponent, {
              key: item.label,
              icon: item.icon,
              label: item.label,
              onClick: item.onClick,
              mouseX: mouseX,
              disabled: item.disabled,
            })
          )}
        </motion.div>
      </div>

      {isSettingsOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
          <div
            onClick={() => setIsSettingsOpen(false)}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(15, 52, 85, 0.24)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workspace settings"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: "min(28rem, calc(100vw - 2rem))",
              maxHeight: "min(34rem, calc(100vh - 2rem))",
              overflow: "hidden",
              borderRadius: "1rem",
              border: "1px solid rgba(15, 52, 85, 0.12)",
              backgroundColor: "var(--cemi-surface-bg, #F9F5EA)",
              boxShadow: "0 24px 80px rgba(15, 52, 85, 0.18)",
            }}
          >
            <div className="px-4 py-3.5">
              <div className="text-md font-semibold text-[#0F3455]">Settings</div>
            </div>

            <div className="space-y-3 overflow-y-auto px-4 py-3.5">
              {[
                {
                  value: "default" as const,
                  label: "Default",
                },
                {
                  value: "light" as const,
                  label: "Light",
                },
              ].map((option) => {
                const isSelected = toolThemeMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToolThemeModeChange(option.value)}
                    className={[
                      "flex w-full items-start gap-3 rounded-xl px-2 mb-2 mt-2 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3455]/20",
                      isSelected ? "text-[#0F3455]" : "text-[#0F3455] hover:bg-[rgba(15,52,85,0.04)]",
                    ].join(" ")}
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center">
                      {isSelected ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-[#0F3455]" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-[rgba(15,52,85,0.38)]" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#0F3455]">{option.label}</span>
                      <span className="mt-1 block text-sm text-[rgba(15,52,85,0.68)]">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center border-t border-[rgba(15,52,85,0.08)] px-4 py-3.5">
              <Button
                type="button"
                variant="outline"
                className="border-0 shadow-none"
                onClick={() => setIsSettingsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface DockItemComponentProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  mouseX: MotionValue<number>;
  disabled?: boolean;
}

const DOCK_ITEM_SIZE = 48;

function DockItemComponent({
  icon,
  label,
  onClick,
  mouseX,
  disabled = false,
}: DockItemComponentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseDistance = useTransform(mouseX, (val: number) => {
    if (val === Infinity) return Infinity;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    const centerX = rect.left + rect.width / 2;
    return val - centerX;
  });
  const distance = 10;
  const scale = useTransform(
    mouseDistance,
    [-distance, -distance / 2, 0, distance / 2, distance],
    [1, 1.12, 1.28, 1.12, 1]
  );
  const scaleSpring = useSpring(scale, { mass: 0.15, stiffness: 90, damping: 18 });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const tooltipText = disabled
    ? `${label} (select a workspace first)`
    : label;

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={tooltipText}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3455]/25 flex shrink-0 items-center justify-center rounded-[0.95rem] cursor-pointer"
      style={{
        width: DOCK_ITEM_SIZE,
        height: DOCK_ITEM_SIZE,
        scale: scaleSpring,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        position: "relative",
      }}
      onHoverStart={() => {
        if (disabled) return;
      }}
      onHoverEnd={() => {}}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div className="inline-flex h-5 w-5 items-center justify-center">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
