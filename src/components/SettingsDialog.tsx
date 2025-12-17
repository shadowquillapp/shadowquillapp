"use client";
import { XMarkIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import AppVersionContent from "./settings/AppVersionContent";
import DisplayContent from "./settings/DisplayContent";
import LocalDataManagementContent from "./settings/LocalDataManagementContent";
import OllamaSetupContent from "./settings/OllamaSetupContent";
import SystemPromptEditorContent from "./settings/SystemPromptEditorContent";

export type SettingsTab = "system" | "ollama" | "data" | "display" | "version";

// Tab order for determining animation direction
const TAB_ORDER: SettingsTab[] = [
	"version",
	"display",
	"data",
	"ollama",
	"system",
];

interface Props {
	open: boolean;
	onClose: () => void;
	initialTab?: SettingsTab;
}

export default function SettingsDialog({
	open,
	onClose,
	initialTab = "version",
}: Props) {
	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
	const [transitionDirection, setTransitionDirection] = useState<"up" | "down">(
		"down",
	);
	const contentHeightRef = useRef<Map<SettingsTab, number>>(new Map());
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [containerHeight, setContainerHeight] = useState<number>(0);

	// Handle tab switching with animation
	const handleTabChange = useCallback(
		(newTab: SettingsTab) => {
			if (newTab === activeTab) return;

			// Determine direction based on tab order
			const currentIndex = TAB_ORDER.indexOf(activeTab);
			const newIndex = TAB_ORDER.indexOf(newTab);
			setTransitionDirection(newIndex > currentIndex ? "down" : "up");

			// Update to new tab
			setActiveTab(newTab);

			// Update container height based on cached or estimated height
			const cachedHeight = contentHeightRef.current.get(newTab);
			if (cachedHeight) {
				setContainerHeight(cachedHeight);
			}
		},
		[activeTab],
	);

	// Update container height whenever content changes
	useEffect(() => {
		if (!containerRef.current) return;

		const updateHeight = () => {
			const activeContent = containerRef.current?.querySelector(
				`[data-tab="${activeTab}"]`,
			) as HTMLElement;

			if (activeContent) {
				const height = activeContent.offsetHeight;
				contentHeightRef.current.set(activeTab, height);
				setContainerHeight(height);
			}
		};

		// Initial measurement
		updateHeight();

		// Use ResizeObserver to track content size changes
		const resizeObserver = new ResizeObserver(() => {
			updateHeight();
		});

		const activeContent = containerRef.current?.querySelector(
			`[data-tab="${activeTab}"]`,
		) as HTMLElement;
		if (activeContent) {
			resizeObserver.observe(activeContent);
		}

		return () => {
			resizeObserver.disconnect();
		};
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
				className={`settings-tab-btn text-left ${isActive ? "settings-tab-btn--active" : ""}`}
				style={{
					width: "100%",
					textAlign: "left",
					padding: "12px 14px",
					borderRadius: 10,
					background: isActive
						? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
						: "transparent",
					color: isActive ? "var(--color-primary)" : "var(--color-on-surface)",
					border: isActive
						? "1.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)"
						: "1.5px solid transparent",
					outline: "none",
					fontWeight: isActive ? 600 : 500,
					fontSize: "14px",
					cursor: "pointer",
					letterSpacing: "-0.01em",
					boxShadow: isActive
						? "0 1px 3px color-mix(in srgb, var(--color-primary) 10%, transparent)"
						: "none",
				}}
			>
				{label}
			</button>
		);
	};

	const renderContentFor = (tab: SettingsTab | string) => {
		switch (tab) {
			case "system":
				return <SystemPromptEditorContent />;
			case "ollama":
				return <OllamaSetupContent />;
			case "data":
				return <LocalDataManagementContent />;
			case "display":
				return <DisplayContent />;
			case "version":
				return <AppVersionContent />;
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
				onKeyDown={(e) => e.stopPropagation()}
				style={{
					overflow: "hidden",
					width: "min(920px, 95vw)",
					boxShadow: "0 10px 40px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.15)",
				}}
				role="dialog"
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
          
          /* Modal opening animation with elegant spring */
          .settings-dialog--entering {
            animation: modalEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          
          @keyframes modalEnter {
            0% {
              opacity: 0;
              transform: scale(0.92) translateY(20px);
            }
            60% {
              opacity: 1;
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          /* Backdrop fade in with blur */
          .settings-backdrop-animated {
            animation: backdropFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          @keyframes backdropFadeIn {
            from {
              opacity: 0;
              backdrop-filter: blur(0px);
            }
            to {
              opacity: 1;
              backdrop-filter: blur(3px);
            }
          }
          
          /* Sidebar tab button transitions with micro-interactions */
          .settings-tab-btn {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }
          
          .settings-tab-btn:hover {
            background: color-mix(in srgb, var(--color-primary) 8%, transparent);
            transform: translateX(3px);
          }
          
          .settings-tab-btn--active {
            background: color-mix(in srgb, var(--color-primary) 15%, transparent);
            transform: translateX(4px);
          }
          
          .settings-tab-btn:active {
            transform: translateX(2px) scale(0.98);
          }
          
          /* Tab content container - smooth height with spring easing */
          .settings-tab-content {
            position: relative;
            overflow: visible;
            transition: height 0.5s cubic-bezier(0.34, 1.35, 0.64, 1);
          }
          
          /* Tab panel - absolutely positioned for silky crossfade */
          .settings-tab-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            transition: 
              opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.5s cubic-bezier(0.34, 1.35, 0.64, 1),
              filter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: opacity, transform;
          }
          
          /* Active tab - visible with subtle scale for depth */
          .settings-tab-panel--active {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
            pointer-events: auto;
            position: relative;
            z-index: 2;
          }
          
          /* Inactive tabs - elegantly hidden */
          .settings-tab-panel--inactive {
            opacity: 0;
            pointer-events: none;
            filter: blur(0px);
            z-index: 1;
          }
          
          /* Entering from below - elegant upward motion */
          .settings-tab-panel--inactive.settings-tab-panel--from-down {
            transform: translateY(28px) scale(0.96);
          }
          
          /* Entering from above - elegant downward motion */
          .settings-tab-panel--inactive.settings-tab-panel--from-up {
            transform: translateY(-28px) scale(0.96);
          }
          
          /* Add subtle animation to active content */
          .settings-tab-panel--active > * {
            animation: contentEnter 0.45s cubic-bezier(0.34, 1.35, 0.64, 1) forwards;
          }
          
          @keyframes contentEnter {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
				<div
					className="modal-header"
					style={{
						borderBottom: "1px solid var(--color-outline)",
					}}
				>
					<div
						className="modal-title"
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							fontSize: "18px",
							fontWeight: 600,
							letterSpacing: "-0.02em",
						}}
					>
						<Icon name="gear" />
						<span>Settings</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="md-btn"
						style={{
							padding: "8px 12px",
							borderRadius: "8px",
							transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = "scale(1.05)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = "scale(1)";
						}}
					>
						<XMarkIcon className="h-4 w-4" />
					</button>
				</div>
				<div className="modal-body" style={{ overflow: "hidden" }}>
					<div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
						{/* Left sidebar tabs */}
						<nav
							aria-label="Settings sections"
							style={{
								width: 220,
								flex: "0 0 220px",
								display: "flex",
								flexDirection: "column",
								gap: 8,
								padding: 12,
								border: "0px solid var(--color-outline)",
								borderRadius: 12,
								background: "var(--color-surface-variant)",
								overflow: "hidden",
							}}
						>
							<TabItem tab="version" label="App Version" />
							<TabItem tab="display" label="Display" />
							<TabItem tab="data" label="Data Management" />
							<TabItem tab="ollama" label="Ollama Setup" />
							<TabItem tab="system" label="System Prompt" />
						</nav>
						{/* Right content */}
						<div
							style={{
								flex: 1,
								minWidth: 0,
							}}
						>
							<div
								ref={containerRef}
								className="settings-tab-content"
								style={{
									height: containerHeight > 0 ? `${containerHeight}px` : "auto",
								}}
							>
								{/* Render all tabs, but only show the active one */}
								{(
									[
										"version",
										"display",
										"data",
										"ollama",
										"system",
									] as SettingsTab[]
								).map((tab) => {
									const isActive = activeTab === tab;
									const directionClass =
										transitionDirection === "down"
											? "settings-tab-panel--from-down"
											: "settings-tab-panel--from-up";

									return (
										<div
											key={tab}
											data-tab={tab}
											className={`settings-tab-panel ${
												isActive
													? "settings-tab-panel--active"
													: `settings-tab-panel--inactive ${directionClass}`
											}`}
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
