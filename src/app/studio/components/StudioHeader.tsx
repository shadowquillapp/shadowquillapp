"use client";

import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import SettingsDialog from "@/components/SettingsDialog";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

interface StudioHeaderProps {
	isDirty?: boolean;
	isSmallScreen?: boolean;
	onToggleSidebar?: () => void;
}

export default function StudioHeader({
	isDirty,
	isSmallScreen,
	onToggleSidebar,
}: StudioHeaderProps) {
	const router = useRouter();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<
		"system" | "ollama" | "data" | "display"
	>("ollama");

	// Global event to open Settings dialog with initial tab
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const ce = e as CustomEvent;
				const tab = ce?.detail?.tab as "system" | "ollama" | "data" | undefined;
				if (tab) setSettingsInitialTab(tab);
			} catch {}
			setSettingsOpen(true);
		};
		window.addEventListener("open-app-settings", handler as any);
		return () =>
			window.removeEventListener("open-app-settings", handler as any);
	}, []);

	return (
		<>
			<header
				className="simple-workbench__header"
				style={{
					flexWrap: "nowrap",
					gap: "8px",
					padding: "10px 12px",
					alignItems: "center",
				}}
			>
				{/* Left side: Hamburger (mobile) + Title & Logo */}
				<div
					className="simple-workbench__header-left"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						flexWrap: "nowrap",
						flex: "1 1 auto",
						minWidth: 0,
						overflow: "hidden",
					}}
				>
					{/* Hamburger menu for mobile */}
					{isSmallScreen && (
						<button
							type="button"
							className="md-btn"
							style={{
								width: 32,
								height: 32,
								padding: 0,
								flexShrink: 0,
								borderColor: "var(--color-outline)",
								borderRadius: "6px",
								background: "transparent",
								color: "var(--color-on-surface-variant)",
								cursor: "pointer",
							}}
							onClick={onToggleSidebar}
							title="Toggle sidebar"
						>
							<Icon name="bars" style={{ width: 14, height: 14 }} />
						</button>
					)}

					{/* Title + Logo */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<span
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--color-on-surface)",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								whiteSpace: "nowrap",
							}}
						>
							Preset Studio
							{isDirty && (
								<span
									style={{
										width: 6,
										height: 6,
										borderRadius: "50%",
										background: "var(--color-attention)",
										flexShrink: 0,
									}}
									title="Unsaved changes"
								/>
							)}
						</span>
						<Logo
							style={{
								width: 20,
								height: 20,
								flexShrink: 0,
								color: "var(--color-primary)",
							}}
						/>
					</div>
				</div>

				{/* Right side: Actions */}
				<div
					className="simple-workbench__header-actions"
					style={{
						display: "flex",
						gap: "8px",
						flexShrink: 0,
					}}
				>
					<button
						type="button"
						onClick={() => router.push("/workbench")}
						className="md-btn md-btn--primary"
						title="Open Workbench Tab"
						style={{ minWidth: 0, padding: "6px" }}
					>
						<Logo style={{ width: 24, height: 24 }} />
					</button>
					<button
						type="button"
						className="md-btn"
						onClick={() => setSettingsOpen(true)}
						title="Settings"
					>
						<Icon name="gear" />
					</button>
				</div>
			</header>

			{/* Settings Dialog */}
			{settingsOpen && (
				<SettingsDialog
					open={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					initialTab={settingsInitialTab}
				/>
			)}
		</>
	);
}
