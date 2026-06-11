"use client";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import AppVersionContent from "./settings/AppVersionContent";
import LocalDataManagementContent from "./settings/LocalDataManagementContent";
import OllamaSetupContent from "./settings/OllamaSetupContent";
import SystemPromptEditorContent from "./settings/SystemPromptEditorContent";
import { useCloseOnEscape } from "./useCloseOnEscape";

const SETTINGS_TABS = [
	{ tab: "version", label: "App Version", Content: AppVersionContent },
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
	const dialogRef = useRef<HTMLDivElement | null>(null);

	const handleTabChange = useCallback(
		(newTab: SettingsTab) => {
			if (newTab === activeTab) return;
			setActiveTab(newTab);
		},
		[activeTab],
	);

	useEffect(() => {
		if (!open) return;
		setActiveTab(initialTab);
		requestAnimationFrame(() => {
			const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			firstFocusable?.focus();
		});
	}, [open, initialTab]);

	useCloseOnEscape(open, onClose);

	const TabItem: React.FC<{ tab: SettingsTab; label: string }> = ({
		tab,
		label,
	}) => {
		const isActive = activeTab === tab;
		const tabIndex = SETTINGS_TABS.findIndex((item) => item.tab === tab);
		const focusTab = (index: number) => {
			const target = SETTINGS_TABS[index];
			if (!target) return;
			setActiveTab(target.tab);
			requestAnimationFrame(() => {
				document.getElementById(`settings-tab-${target.tab}`)?.focus();
			});
		};
		return (
			<button
				type="button"
				onClick={() => handleTabChange(tab)}
				onKeyDown={(e) => {
					if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
						e.preventDefault();
						focusTab(tabIndex === 0 ? SETTINGS_TABS.length - 1 : tabIndex - 1);
					} else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
						e.preventDefault();
						focusTab(tabIndex === SETTINGS_TABS.length - 1 ? 0 : tabIndex + 1);
					} else if (e.key === "Home") {
						e.preventDefault();
						focusTab(0);
					} else if (e.key === "End") {
						e.preventDefault();
						focusTab(SETTINGS_TABS.length - 1);
					}
				}}
				className={`settings-tab-btn text-left ${isActive ? "settings-tab-btn--active" : ""}`}
				role="tab"
				aria-selected={isActive}
				aria-controls={`settings-panel-${tab}`}
				id={`settings-tab-${tab}`}
				tabIndex={isActive ? 0 : -1}
				style={{
					width: "100%",
					textAlign: "left",
					padding: "8px 12px",
					borderRadius: 0,
					background: isActive
						? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
						: "transparent",
					color: isActive
						? "var(--color-on-surface)"
						: "var(--color-on-surface-variant)",
					border: "none",
					boxShadow: isActive ? "inset 2px 0 0 var(--color-accent)" : "none",
					fontWeight: isActive ? 600 : 500,
					fontSize: "var(--text-md)",
					cursor: "pointer",
				}}
			>
				{label}
			</button>
		);
	};

	if (!open) return null;
	const activeTabConfig = SETTINGS_TABS.find((item) => item.tab === activeTab);
	const ActiveContent = activeTabConfig?.Content ?? AppVersionContent;

	const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (e.key !== "Tab") return;
		const focusable = Array.from(
			dialogRef.current?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			) ?? [],
		).filter((item) => item.offsetParent !== null);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (!first || !last) return;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	return (
		<div className="modal-container">
			<button
				type="button"
				className="modal-backdrop-blur"
				aria-label="Close settings"
				onClick={onClose}
			/>
			<div
				ref={dialogRef}
				className="modal-content modal-content--large settings-dialog"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleDialogKeyDown}
				style={{
					overflow: "auto",
					width: "min(920px, 95vw)",
				}}
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
			>
				<style>{`
          .settings-tab-btn {
            transition: background 120ms linear, color 120ms linear;
            position: relative;
          }

          .settings-tab-btn:focus-visible {
            outline: 2px solid var(--color-accent);
            outline-offset: -2px;
          }

          .settings-tab-btn:hover {
            background: var(--color-surface-variant);
            color: var(--color-on-surface);
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
							gap: 8,
						}}
					>
						<Icon name="gear" />
						<span id="settings-title">Settings</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="md-close-btn"
						aria-label="Close"
						title="Close"
					>
						<Icon name="close" className="h-4 w-4" />
					</button>
				</div>
				<div className="modal-body" style={{ overflow: "hidden", padding: 0 }}>
					<div style={{ display: "flex", alignItems: "stretch" }}>
						<div
							aria-label="Settings sections"
							role="tablist"
							style={{
								width: 200,
								flex: "0 0 200px",
								display: "flex",
								flexDirection: "column",
								gap: 0,
								padding: "8px 0",
								borderRight: "1px solid var(--color-outline)",
								background: "var(--color-panel-head)",
								overflow: "hidden",
							}}
						>
							{SETTINGS_TABS.map((item) => (
								<TabItem key={item.tab} tab={item.tab} label={item.label} />
							))}
						</div>
						<div
							style={{
								flex: 1,
								minWidth: 0,
								padding: 16,
							}}
						>
							<div
								id={`settings-panel-${activeTab}`}
								role="tabpanel"
								aria-labelledby={`settings-tab-${activeTab}`}
							>
								<ActiveContent />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
