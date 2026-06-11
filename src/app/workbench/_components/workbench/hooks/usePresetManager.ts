import { useCallback, useEffect, useState } from "react";
import {
	getLastSelectedPresetKey,
	mapPresetList,
	mapPresetToSummary,
	type PresetSummary,
	presetKey,
	pruneRecentPresets,
	setLastSelectedPresetKey,
	trackRecentPreset,
} from "@/lib/preset-store";
import { getPresets, type Preset } from "@/lib/presets";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { useTabManager } from "../useTabManager";

export function usePresetManager(tabManager: ReturnType<typeof useTabManager>) {
	const [presets, setPresets] = useState<PresetSummary[]>([]);
	const [loadingPresets, setLoadingPresets] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] = useState("");

	const applyPreset = useCallback(
		(p: PresetSummary, opts?: { trackRecent?: boolean }) => {
			const trackRecent = opts?.trackRecent ?? true;
			if (trackRecent) {
				try {
					trackRecentPreset(p);
				} catch {}
			}
		},
		[],
	);

	const loadPreset = useCallback(
		(preset: PresetSummary, opts?: { trackRecent?: boolean }) => {
			const summary = mapPresetToSummary(preset);
			const applyOpts =
				opts?.trackRecent === undefined
					? undefined
					: { trackRecent: opts.trackRecent };
			applyPreset(preset, applyOpts);
			const newKey = presetKey(summary);
			setSelectedPresetKey(newKey);
			try {
				setLastSelectedPresetKey(newKey);
			} catch {}
			if (tabManager.canCreateTab) {
				tabManager.createTab(summary);
			}
		},
		[applyPreset, tabManager],
	);

	useEffect(() => {
		const load = async () => {
			setLoadingPresets(true);
			try {
				const list = mapPresetList(getPresets());
				setPresets(list);
				try {
					pruneRecentPresets(list);
				} catch {}
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
						} catch {}
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
			const data = getPresets();
			const list = mapPresetList(data ?? []);
			setPresets(list);
		};

		window.addEventListener("focus", handleFocus);
		return () => window.removeEventListener("focus", handleFocus);
	}, []);

	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === STORAGE_KEYS.PRESETS.key && e.newValue) {
				try {
					const data = JSON.parse(e.newValue) as Preset[];
					const list = mapPresetList(data ?? []);
					setPresets(list);
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
				if (updatedPreset) {
					const summary = mapPresetToSummary(updatedPreset);
					if (JSON.stringify(tab.preset) !== JSON.stringify(summary)) {
						setPresetForTab(tab.id, summary);
					}
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
