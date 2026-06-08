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
import { useCloseOnEscape } from "./useCloseOnEscape";

const SETTINGS_TABS = [
	{ tab: "version", label: "App Version", Content: AppVersionContent },
	{ tab: "display", label: "Display", Content: DisplayContent },
	{
		tab: "data",
		label: "Data Management",
		Content: LocalDataManagementContent,
	},
	{ tab: "ollama", label: "Ollama Setup", Content: OllamaSetupContent },
	{ tab: "system", label: "System Prompt", Content: SystemPromptEditorContent },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["tab"];

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

	const handleTabChange = useCallback(
		(newTab: SettingsTab) => {
			if (newTab === activeTab) return;

			const currentIndex = SETTINGS_TABS.findIndex(
				(item) => item.tab === activeTab,
			);
			const newIndex = SETTINGS_TABS.findIndex((item) => item.tab === newTab);
			setTransitionDirection(newIndex > currentIndex ? "down" : "up");

			setActiveTab(newTab);

			const cachedHeight = contentHeightRef.current.get(newTab);
			if (cachedHeight) {
				setContainerHeight(cachedHeight);
			}
		},
		[activeTab],
	);

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

		updateHeight();

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

	useCloseOnEscape(open, onClose);

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
				<span
					style={{
						textDecorationLine: "underline",
						textUnderlineOffset: "3px",
						textDecorationThickness: "1px",
						textDecorationColor: isActive
							? "var(--color-primary)"
							: "var(--color-outline)",
					}}
				>
					{label}
				</span>
			</button>
		);
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
          
          .settings-tab-content {
            position: relative;
            overflow: visible;
            transition: height 0.5s cubic-bezier(0.34, 1.35, 0.64, 1);
          }
          
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
          
          .settings-tab-panel--active {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
            pointer-events: auto;
            position: relative;
            z-index: 2;
          }
          
          .settings-tab-panel--inactive {
            opacity: 0;
            pointer-events: none;
            filter: blur(0px);
            z-index: 1;
          }
          
          .settings-tab-panel--inactive.settings-tab-panel--from-down {
            transform: translateY(28px) scale(0.96);
          }
          
          .settings-tab-panel--inactive.settings-tab-panel--from-up {
            transform: translateY(-28px) scale(0.96);
          }
          
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
						className="md-close-btn"
						aria-label="Close"
						title="Close"
					>
						<XMarkIcon className="h-4 w-4" />
					</button>
				</div>
				<div className="modal-body" style={{ overflow: "hidden" }}>
					<div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
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
							{SETTINGS_TABS.map((item) => (
								<TabItem key={item.tab} tab={item.tab} label={item.label} />
							))}
						</nav>
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
								{SETTINGS_TABS.map(({ tab, Content }) => {
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
											<Content />
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
