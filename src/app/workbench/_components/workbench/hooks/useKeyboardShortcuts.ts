import { useEffect } from "react";
import type { useTabManager } from "../useTabManager";

function isModKey(e: KeyboardEvent): boolean {
	return e.metaKey || e.ctrlKey;
}

export function useKeyboardShortcuts(
	tabManager: ReturnType<typeof useTabManager>,
	setShowPresetPicker: (show: boolean) => void,
	setPresetPickerForNewTab: (forNewTab: boolean) => void,
	closeActiveTab: () => void,
	send: () => Promise<void>,
) {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (isModKey(e) && e.key === "t") {
				e.preventDefault();
				if (tabManager.canCreateTab) {
					setShowPresetPicker(true);
					setPresetPickerForNewTab(true);
				}
			}
			if (isModKey(e) && e.key === "w") {
				e.preventDefault();
				closeActiveTab();
			}
			if (isModKey(e) && e.key >= "1" && e.key <= "8") {
				e.preventDefault();
				const index = Number.parseInt(e.key, 10) - 1;
				const targetTab = tabManager.tabs[index];
				if (targetTab) {
					tabManager.switchTab(targetTab.id);
				}
			}
			if (isModKey(e) && e.key === "Enter") {
				e.preventDefault();
				const activeTab = tabManager.activeTab;
				if (!activeTab || activeTab.sending || !activeTab.draft.trim()) {
					return;
				}
				void send();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [
		tabManager,
		setShowPresetPicker,
		setPresetPickerForNewTab,
		closeActiveTab,
		send,
	]);
}
