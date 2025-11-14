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
  const contentRef = React.useRef<HTMLDivElement | null>(null);

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
          
          .settings-tab-content {
            animation: fadeInSlide 0.5s ease-out;
          }
          
          @keyframes fadeInSlide {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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
                ref={contentRef}
                style={{
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Render all tabs, but only show the active one */}
                <div
                  key={`system-${activeTab === "system" ? "active" : "hidden"}`}
                  className={activeTab === "system" ? "settings-tab-content" : ""}
                  style={{
                    display: activeTab === "system" ? "block" : "none",
                  }}
                >
                  {renderContentFor("system")}
                </div>
                <div
                  key={`ollama-${activeTab === "ollama" ? "active" : "hidden"}`}
                  className={activeTab === "ollama" ? "settings-tab-content" : ""}
                  style={{
                    display: activeTab === "ollama" ? "block" : "none",
                  }}
                >
                  {renderContentFor("ollama")}
                </div>
                <div
                  key={`data-${activeTab === "data" ? "active" : "hidden"}`}
                  className={activeTab === "data" ? "settings-tab-content" : ""}
                  style={{
                    display: activeTab === "data" ? "block" : "none",
                  }}
                >
                  {renderContentFor("data")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


