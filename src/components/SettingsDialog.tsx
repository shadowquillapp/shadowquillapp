"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "./Icon";
import LocalDataManagementContent from "./settings/LocalDataManagementContent";
import OllamaSetupContent from "./settings/OllamaSetupContent";
import SystemPromptEditorContent from "./settings/SystemPromptEditorContent";
import DisplayContent from "./settings/DisplayContent";

export type SettingsTab = "system" | "ollama" | "data" | "display";

interface Props {
	open: boolean;
	onClose: () => void;
	initialTab?: SettingsTab;
}

export default function SettingsDialog({
	open,
	onClose,
	initialTab = "ollama",
}: Props) {
	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

	// Handle tab switching
	const handleTabChange = useCallback((newTab: SettingsTab) => {
		if (newTab === activeTab) return;
		setActiveTab(newTab);
	}, [activeTab]);

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

	const TabItem: React.FC<{ tab: SettingsTab; label: string }> = ({
		tab,
		label,
	}) => {
		const isActive = activeTab === tab;
		return (
			<button
				type="button"
				onClick={() => handleTabChange(tab)}
				className={`text-left settings-tab-btn ${isActive ? "settings-tab-btn--active" : ""}`}
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
				return (
					<SystemPromptEditorContent
						onSaved={() => {}}
						onCancelReset={() => {}}
					/>
				);
			case "ollama":
				return <OllamaSetupContent />;
			case "data":
				return <LocalDataManagementContent />;
			case "display":
			 return <DisplayContent />;
			default:
				return null;
		}
	};

	if (!open) return null;

	return (
		<div className="modal-container">
			<div className="modal-backdrop-blur settings-backdrop-animated" />
			<div
				className="modal-content modal-content--large settings-dialog settings-dialog--entering"
				onClick={(e) => e.stopPropagation()}
				style={{ overflow: "hidden" }}
			>
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
          
          /* Modal opening animation */
          .settings-dialog--entering {
            animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          @keyframes modalEnter {
            from {
              opacity: 0;
              transform: scale(0.96) translateY(8px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          /* Backdrop fade in */
          .settings-backdrop-animated {
            animation: backdropFadeIn 0.35s ease-out forwards;
          }
          
          @keyframes backdropFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          /* Sidebar tab button transitions */
          .settings-tab-btn {
            transition: all 0.2s ease;
          }
          
          .settings-tab-btn:hover {
            background: rgba(108, 140, 255, 0.08);
          }
          
          .settings-tab-btn--active {
            background: rgba(108, 140, 255, 0.12);
          }
        `}</style>
				<div className="modal-header">
					<div
						className="modal-title"
						style={{ display: "flex", alignItems: "center", gap: 10 }}
					>
						<Icon name="gear" />
						<span>Settings</span>
					</div>
					<button
						onClick={onClose}
						className="md-btn"
						style={{ padding: "6px 10px" }}
					>
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
								gap: 6,
								padding: 8,
								border: "1px solid var(--color-outline)",
								borderRadius: 12,
								background: "var(--color-surface-variant)",
								overflow: "hidden",
							}}
						>
						<TabItem tab="ollama" label="Ollama Setup" />
						<TabItem tab="system" label="System Prompt" />
						<TabItem tab="data" label="Data Management" />
						<TabItem tab="display" label="Display" />
						</nav>
						{/* Right content */}
						<div 
							style={{ 
								flex: 1, 
								minWidth: 0,
							}}
						>
							<div
								style={{
									position: "relative",
								}}
							>
								{/* Render tabs - keep all mounted to avoid refresh */}
								{(["system", "ollama", "data", "display"] as SettingsTab[]).map((tab) => {
									const isActive = activeTab === tab;
									
									return (
										<div
											key={tab}
											style={{
												display: isActive ? "block" : "none",
											}}
											aria-hidden={!isActive}
										>
											{renderContentFor(tab)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
