import { useEffect } from "react";
import type { useTabManager } from "../useTabManager";

/**
 * Hook for handling keyboard shortcuts in the workbench.
 */
export function useKeyboardShortcuts(
	tabManager: ReturnType<typeof useTabManager>,
	setShowPresetPicker: (show: boolean) => void,
	setPresetPickerForNewTab: (forNewTab: boolean) => void,
) {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "t") {
				e.preventDefault();
				if (tabManager.canCreateTab) {
					setShowPresetPicker(true);
					setPresetPickerForNewTab(true);
				}
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "w") {
				e.preventDefault();
				const activeTab = tabManager.activeTab;
				if (activeTab) {
					tabManager.closeTab(activeTab.id);
				}
			}
			// Switch tabs with Cmd/Ctrl + 1-8
			if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "8") {
				e.preventDefault();
				const index = Number.parseInt(e.key, 10) - 1;
				const targetTab = tabManager.tabs[index];
				if (targetTab) {
					tabManager.switchTab(targetTab.id);
				}
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [tabManager, setShowPresetPicker, setPresetPickerForNewTab]);
}
