import { useCallback, useEffect, useRef, useState } from "react";
import {
	consumeApplyPreset,
	getLastSelectedPresetKey,
	mapPresetList,
	mapPresetToSummary,
	presetKey,
	pruneRecentPresets,
	setLastSelectedPresetKey,
	trackRecentPreset,
} from "@/lib/preset-store";
import { getPresets, type Preset } from "@/lib/presets";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { GenerationOptions, TaskType } from "@/types";
import type { useTabManager } from "../useTabManager";

/**
 * Hook for managing presets.
 */
export function usePresetManager(
	tabManager: ReturnType<typeof useTabManager>,
	_showPresetPicker: boolean,
	setShowPresetPicker: (show: boolean) => void,
	setPresetPickerForNewTab: (forNewTab: boolean) => void,
) {
	const [presets, setPresets] = useState<
		Array<{
			id?: string;
			name: string;
			taskType: TaskType;
			options?: GenerationOptions;
		}>
	>([]);
	const [loadingPresets, setLoadingPresets] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] = useState("");
	const hasAutoShownPresetPicker = useRef(false);

	const applyPreset = useCallback(
		(
			p: {
				name: string;
				taskType: TaskType;
				options?: GenerationOptions;
				id?: string;
			},
			opts?: { trackRecent?: boolean },
		) => {
			const trackRecent = opts?.trackRecent ?? true;
			if (trackRecent) {
				try {
					trackRecentPreset(p);
				} catch {}
			}
		},
		[],
	);

	const presetToSummary = useCallback(
		(p: {
			id?: string;
			name: string;
			taskType: TaskType;
			options?: GenerationOptions;
		}) => mapPresetToSummary(p),
		[],
	);

	const loadPreset = useCallback(
		(
			preset: {
				id?: string;
				name: string;
				taskType: TaskType;
				options?: GenerationOptions;
			},
			opts?: { trackRecent?: boolean },
		) => {
			const summary = presetToSummary(preset);
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
		[applyPreset, presetToSummary, tabManager],
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
		const applyPresetFromStorage = () => {
			try {
				const preset = consumeApplyPreset();
				if (preset) loadPreset(preset);
			} catch (error) {
				console.error("Failed to apply preset from storage:", error);
			}
		};
		applyPresetFromStorage();
	}, [loadPreset]);

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
					const summary = presetToSummary(updatedPreset);
					if (JSON.stringify(tab.preset) !== JSON.stringify(summary)) {
						setPresetForTab(tab.id, summary);
					}
				}
			}
		});
	}, [presets, presetToSummary, tabManager]);
	useEffect(() => {
		if (loadingPresets || presets.length === 0) return;

		if (tabManager.tabs.length > 0) {
			hasAutoShownPresetPicker.current = false;
			return;
		}

		if (!hasAutoShownPresetPicker.current) {
			hasAutoShownPresetPicker.current = true;
			const dailyHelperPreset = presets.find((p) => p.id === "daily-assistant");
			if (dailyHelperPreset) {
				loadPreset(dailyHelperPreset, { trackRecent: false });
			} else {
				setShowPresetPicker(true);
				setPresetPickerForNewTab(true);
			}
		}
	}, [
		loadingPresets,
		presets,
		tabManager.tabs.length,
		loadPreset,
		setShowPresetPicker,
		setPresetPickerForNewTab,
	]);

	return {
		presets,
		loadingPresets,
		selectedPresetKey,
		setSelectedPresetKey,
		applyPreset,
		presetToSummary,
		loadPreset,
	};
}
