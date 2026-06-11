"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import SettingsDialog, { type SettingsTab } from "@/components/SettingsDialog";

interface StudioHeaderProps {
	isSmallScreen?: boolean;
	sidebarOpen?: boolean;
	onToggleSidebar?: () => void;
}

export default function StudioHeader({
	isSmallScreen,
	sidebarOpen,
	onToggleSidebar,
}: StudioHeaderProps) {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] =
		useState<SettingsTab>("version");

	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const ce = e as CustomEvent;
				const tab = ce?.detail?.tab as "system" | "ollama" | "data" | undefined;
				if (tab) setSettingsInitialTab(tab);
			} catch {}
			setSettingsOpen(true);
		};
		window.addEventListener("open-app-settings", handler);
		return () => window.removeEventListener("open-app-settings", handler);
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
					{isSmallScreen && (
						<button
							type="button"
							className="md-icon-btn"
							style={{ flexShrink: 0 }}
							onClick={onToggleSidebar}
							title="Toggle sidebar"
							aria-label="Toggle preset library sidebar"
							aria-expanded={sidebarOpen}
						>
							<Icon name="bars" className="h-4 w-4" />
						</button>
					)}

					<span
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--color-on-surface)",
							whiteSpace: "nowrap",
						}}
					>
						Preset Studio
					</span>
				</div>
			</header>

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
