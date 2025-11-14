"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import SystemPromptEditorContent from "./settings/SystemPromptEditorContent";
import LocalDataManagementContent from "./settings/LocalDataManagementContent";
import OllamaSetupContent from "./settings/OllamaSetupContent";

export type SettingsTab = "system" | "ollama" | "data";

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export default function SettingsDialog({ open, onClose, initialTab = "system" }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [displayedTab, setDisplayedTab] = useState<SettingsTab>(initialTab);
  const [incomingTab, setIncomingTab] = useState<SettingsTab | null>(null);
  const [animPhase, setAnimPhase] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const prevRef = React.useRef<HTMLDivElement | null>(null);
  const nextRef = React.useRef<HTMLDivElement | null>(null);
  const animTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const TabItem: React.FC<{ tab: SettingsTab; label: string }> = ({ tab, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className="text-left"
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: 8,
          background: isActive ? "rgba(108,140,255,0.12)" : "transparent",
          color: "var(--color-on-surface)",
          border: "1px solid transparent",
          outline: isActive ? "2px solid var(--color-primary)" : "none",
          outlineOffset: -2,
          fontWeight: isActive ? 600 : 500,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  // Start transition when activeTab changes
  useEffect(() => {
    if (!open) return;
    if (activeTab === displayedTab) return;
    // Cancel any ongoing animation
    if (animTimerRef.current) {
      window.clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    setIncomingTab(activeTab);
    setAnimPhase(false);
    // Measure heights in next frame
    const id1 = window.requestAnimationFrame(() => {
      const prevH = prevRef.current?.offsetHeight ?? 0;
      const nextH = nextRef.current?.offsetHeight ?? prevH;
      // Lock current height, then animate to next
      setContainerHeight(prevH);
      const id2 = window.requestAnimationFrame(() => {
        setAnimPhase(true);
        setContainerHeight(nextH);
        animTimerRef.current = window.setTimeout(() => {
          setDisplayedTab(activeTab);
          setIncomingTab(null);
          setAnimPhase(false);
        }, 380);
      });
      return () => window.cancelAnimationFrame(id2);
    });
    return () => window.cancelAnimationFrame(id1);
  }, [activeTab, displayedTab, open]);

  // Keep container height synced to current content to avoid post-animation jolts
  useEffect(() => {
    if (!open) return;
    // Only track when no crossfade is in progress
    if (incomingTab) return;
    const el = prevRef.current;
    if (!el) return;
    // Set initial measured height
    try {
      setContainerHeight(el.offsetHeight);
    } catch {}
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => {
        try {
          setContainerHeight(el.offsetHeight);
        } catch {}
      });
      ro.observe(el);
    } catch {/* ignore if ResizeObserver not available */}
    return () => {
      try { ro?.disconnect(); } catch {}
    };
  }, [displayedTab, open, incomingTab]);

  const renderContentFor = (tab: SettingsTab) => {
    switch (tab) {
      case "system":
        return <SystemPromptEditorContent onSaved={() => {}} onCancelReset={() => {}} />;
      case "ollama":
        return <OllamaSetupContent />;
      case "data":
        return <LocalDataManagementContent />;
      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <div className="modal-container">
      <div className="modal-backdrop-blur" onClick={onClose} />
      <div className="modal-content modal-content--large settings-dialog" onClick={(e) => e.stopPropagation()} style={{ overflow: "hidden" }}>
        <style>{`
          .settings-dialog, .settings-dialog * {
            scrollbar-width: none;
          }
          .settings-dialog::-webkit-scrollbar,
          .settings-dialog *::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
            display: none !important;
          }
        `}</style>
        <div className="modal-header">
          <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="gear" />
            <span>Settings</span>
          </div>
          <button onClick={onClose} className="md-btn" style={{ padding: "6px 10px" }}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Left sidebar tabs */}
            <nav
              aria-label="Settings sections"
              style={{
                width: 220,
                flex: "0 0 220px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 8,
                border: "1px solid var(--color-outline)",
                borderRadius: 12,
                background: "var(--color-surface-variant)",
                overflow: "hidden",
              }}
            >
              <TabItem tab="system" label="System Prompt" />
              <TabItem tab="ollama" label="Ollama Setup" />
              <TabItem tab="data" label="Data Management" />
            </nav>
            {/* Right content */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div
                ref={containerRef}
                style={{
                  position: "relative",
                  height: containerHeight !== undefined ? `${containerHeight}px` : undefined,
                  transition: "height 350ms ease",
                  willChange: "height",
                  overflow: "hidden",
                }}
              >
                {/* Outgoing (current) */}
                <div
                  ref={prevRef}
                  style={{
                    position: incomingTab ? "absolute" as const : "relative" as const,
                    inset: incomingTab ? 0 : undefined,
                    opacity: incomingTab ? (animPhase ? 0 : 1) : 1,
                    transform: incomingTab ? (animPhase ? "translateY(-6px)" : "translateY(0px)") : "none",
                    transition: incomingTab ? "opacity 350ms ease, transform 350ms ease" : "none",
                    pointerEvents: incomingTab ? "none" : "auto",
                    overflow: "hidden",
                  }}
                >
                  {renderContentFor(displayedTab)}
                </div>
                {/* Incoming (next) */}
                {incomingTab && (
                  <div
                    ref={nextRef}
                    style={{
                      position: "relative",
                      opacity: animPhase ? 1 : 0,
                      transform: animPhase ? "translateY(0px)" : "translateY(6px)",
                      transition: "opacity 350ms ease, transform 350ms ease",
                      overflow: "hidden",
                    }}
                    aria-hidden={!animPhase}
                  >
                    {renderContentFor(incomingTab)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


