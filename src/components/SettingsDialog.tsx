"use client";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import DisplayContent from "./settings/DisplayContent";
import LocalDataManagementContent from "./settings/LocalDataManagementContent";
import OllamaSetupContent from "./settings/OllamaSetupContent";
import SystemPromptEditorContent from "./settings/SystemPromptEditorContent";

export type SettingsTab = "system" | "ollama" | "data" | "display";

// Tab order for determining animation direction
const TAB_ORDER: SettingsTab[] = ["ollama", "system", "data", "display"];

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
	const [displayedTab, setDisplayedTab] = useState<SettingsTab>(initialTab);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionDirection, setTransitionDirection] = useState<"up" | "down">(
		"down",
	);
	const [contentHeight, setContentHeight] = useState<number | "auto">("auto");
	const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const contentWrapperRef = useRef<HTMLDivElement | null>(null);

	// Handle tab switching with animation
	const handleTabChange = useCallback(
		(newTab: SettingsTab) => {
			if (newTab === activeTab || isTransitioning) return;

			// Capture current height before animating
			const currentHeight = contentWrapperRef.current?.offsetHeight;
			if (currentHeight) {
				setContentHeight(currentHeight);
			}

			// Determine direction based on tab order
			const currentIndex = TAB_ORDER.indexOf(activeTab);
			const newIndex = TAB_ORDER.indexOf(newTab);
			setTransitionDirection(newIndex > currentIndex ? "down" : "up");

			// Start transition
			setIsTransitioning(true);
			setActiveTab(newTab);

			// Clear any existing timeout
			if (transitionTimeoutRef.current) {
				clearTimeout(transitionTimeoutRef.current);
			}

			// After exit animation, switch displayed content and start enter animation
			transitionTimeoutRef.current = setTimeout(() => {
				setDisplayedTab(newTab);
				// Measure new content height after DOM update
				requestAnimationFrame(() => {
					const newHeight = contentWrapperRef.current?.scrollHeight;
					if (newHeight) {
						setContentHeight(newHeight);
					}
					transitionTimeoutRef.current = setTimeout(() => {
						setIsTransitioning(false);
						// After animation completes, reset to auto for dynamic content
						setTimeout(() => {
							setContentHeight("auto");
						}, 200);
					}, 450); // Duration of enter animation
				});
			}, 300); // Duration of exit animation
		},
		[activeTab, isTransitioning],
	);

	useEffect(() => {
		if (!open) return;
		setActiveTab(initialTab);
		setDisplayedTab(initialTab);
		setIsTransitioning(false);
		setContentHeight("auto");
	}, [open, initialTab]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (transitionTimeoutRef.current) {
				clearTimeout(transitionTimeoutRef.current);
			}
		};
	}, []);

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
				onKeyDown={(e) => e.stopPropagation()}
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
          
          /* Tab content container */
          .settings-tab-content {
            position: relative;
            overflow: hidden;
          }
          
          /* Tab panel base styles */
          .settings-tab-panel {
            will-change: opacity, transform;
          }
          
          /* Idle state - visible and static */
          .settings-tab-panel--idle {
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Exit animations */
          .settings-tab-panel--exiting-down {
            animation: tabExitDown 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
          }
          
          .settings-tab-panel--exiting-up {
            animation: tabExitUp 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
          }
          
          /* Enter animations */
          .settings-tab-panel--entering-down {
            animation: tabEnterDown 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          .settings-tab-panel--entering-up {
            animation: tabEnterUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          @keyframes tabExitDown {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(-12px);
            }
          }
          
          @keyframes tabExitUp {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(12px);
            }
          }
          
          @keyframes tabEnterDown {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes tabEnterUp {
            from {
              opacity: 0;
              transform: translateY(-16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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
						type="button"
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
								className="settings-tab-content"
								style={{
									position: "relative",
									height: contentHeight === "auto" ? "auto" : contentHeight,
									transition: "height 0.25s ease-out",
									overflow: "hidden",
								}}
							>
								<div ref={contentWrapperRef}>
									{/* Render only the displayed tab with animations */}
									{(
										["system", "ollama", "data", "display"] as SettingsTab[]
									).map((tab) => {
										const isDisplayed = displayedTab === tab;
										const isTargetTab = activeTab === tab;

										// Determine animation class
										let animationClass = "settings-tab-panel--idle";
										if (isTransitioning) {
											if (isDisplayed && !isTargetTab) {
												// Current tab exiting
												animationClass =
													transitionDirection === "down"
														? "settings-tab-panel--exiting-down"
														: "settings-tab-panel--exiting-up";
											} else if (isDisplayed && isTargetTab) {
												// New tab entering
												animationClass =
													transitionDirection === "down"
														? "settings-tab-panel--entering-down"
														: "settings-tab-panel--entering-up";
											}
										}

										return (
											<div
												key={tab}
												className={`settings-tab-panel ${animationClass}`}
												style={{
													display: isDisplayed ? "block" : "none",
												}}
												aria-hidden={!isDisplayed}
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
		</div>
	);
}
