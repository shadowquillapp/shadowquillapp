"use client";

import { useEffect, useState } from "react";
import SettingsDialog, { type SettingsTab } from "./SettingsDialog";

export default function AppSettingsHost() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] =
		useState<SettingsTab>("version");

	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const ce = e as CustomEvent<{ tab?: "system" | "ollama" | "data" }>;
				const tab = ce?.detail?.tab;
				if (tab) setSettingsInitialTab(tab);
			} catch {}
			setSettingsOpen(true);
		};
		window.addEventListener("open-app-settings", handler);
		return () => window.removeEventListener("open-app-settings", handler);
	}, []);

	if (!settingsOpen) return null;

	return (
		<SettingsDialog
			open={settingsOpen}
			onClose={() => setSettingsOpen(false)}
			initialTab={settingsInitialTab}
		/>
	);
}
