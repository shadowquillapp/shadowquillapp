import { useCallback, useEffect, useState } from "react";
import { getPresets, type Preset } from "@/lib/domain/presets";
import {
	getLastSelectedPresetKey,
	presetKey,
	pruneRecentPresets,
	setLastSelectedPresetKey,
	trackRecentPreset,
} from "@/lib/preset-store";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { PresetLite } from "@/types";
import type { useTabManager } from "../useTabManager";

export function usePresetManager(tabManager: ReturnType<typeof useTabManager>) {
	const [presets, setPresets] = useState<PresetLite[]>([]);
	const [loadingPresets, setLoadingPresets] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] = useState("");

	const applyPreset = useCallback(
		(p: PresetLite, opts?: { trackRecent?: boolean }) => {
			const trackRecent = opts?.trackRecent ?? true;
			if (trackRecent) {
				try {
					trackRecentPreset(p);
				} catch (e) {
					console.debug("[usePresetManager] track recent preset failed:", e);
				}
			}
		},
		[],
	);

	const loadPreset = useCallback(
		(preset: PresetLite, opts?: { trackRecent?: boolean }) => {
			const applyOpts =
				opts?.trackRecent === undefined
					? undefined
					: { trackRecent: opts.trackRecent };
			applyPreset(preset, applyOpts);
			const newKey = presetKey(preset);
			setSelectedPresetKey(newKey);
			try {
				setLastSelectedPresetKey(newKey);
			} catch (e) {
				console.debug("[usePresetManager] persist preset key failed:", e);
			}
			if (tabManager.canCreateTab) {
				tabManager.createTab(preset);
			}
		},
		[applyPreset, tabManager],
	);

	useEffect(() => {
		const load = async () => {
			setLoadingPresets(true);
			try {
				const list = getPresets();
				setPresets(list);
				try {
					pruneRecentPresets(list);
				} catch (e) {
					console.debug("[usePresetManager] prune recent presets failed:", e);
				}
				if (!selectedPresetKey) {
					const lastKey = getLastSelectedPresetKey();
					const pick =
						(lastKey && list.find((p) => presetKey(p) === lastKey)) ||
						list[0] ||
						null;
					if (pick) {
						const key = presetKey(pick);
						setSelectedPresetKey(key);
						try {
							setLastSelectedPresetKey(key);
						} catch (e) {
							console.debug("[usePresetManager] persist preset key failed:", e);
						}
						applyPreset(pick);
					}
				}
			} finally {
				setLoadingPresets(false);
			}
		};
		void load();
	}, [applyPreset, selectedPresetKey]);

	useEffect(() => {
		const activeTab = tabManager.activeTab;
		if (activeTab?.preset) {
			applyPreset(activeTab.preset, { trackRecent: false });
		}
	}, [tabManager.activeTab?.preset, applyPreset, tabManager.activeTab]);

	useEffect(() => {
		const handleFocus = () => {
			setPresets(getPresets());
		};

		window.addEventListener("focus", handleFocus);
		return () => window.removeEventListener("focus", handleFocus);
	}, []);

	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === STORAGE_KEYS.PRESETS.key && e.newValue) {
				try {
					const data = JSON.parse(e.newValue) as Preset[];
					setPresets(data ?? []);
				} catch (error) {
					console.error("Failed to parse preset changes from storage:", error);
				}
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	useEffect(() => {
		if (presets.length === 0) return;
		if (!tabManager.setPresetForTab) return;
		const { tabs, setPresetForTab } = tabManager;
		tabs.forEach((tab) => {
			if (tab.preset.id) {
				const updatedPreset = presets.find((p) => p.id === tab.preset.id);
				if (
					updatedPreset &&
					JSON.stringify(tab.preset) !== JSON.stringify(updatedPreset)
				) {
					setPresetForTab(tab.id, updatedPreset);
				}
			}
		});
	}, [presets, tabManager]);

	return {
		presets,
		loadingPresets,
		selectedPresetKey,
		setSelectedPresetKey,
		applyPreset,
		loadPreset,
	};
}
