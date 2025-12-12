import { useCallback, useEffect, useRef, useState } from "react";
import { getJSON, setJSON } from "@/lib/local-storage";
import { getPresets, type Preset } from "@/lib/presets";
import type { GenerationOptions, TaskType } from "@/types";
import type { useTabManager } from "../useTabManager";
import { mapPresetList, mapPresetToSummary } from "../utils/presetUtils";

/**
 * Hook for managing presets: loading, applying, and syncing with tabs.
 */
export function usePresetManager(
	tabManager: ReturnType<typeof useTabManager>,
	showPresetPicker: boolean,
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
				const key = p.id ?? p.name;
				try {
					const prev = getJSON<string[]>("recent-presets", []);
					const next = [key, ...prev.filter((k) => k !== key)].slice(0, 3);
					setJSON("recent-presets", next);
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
			const newKey = summary.id ?? summary.name;
			setSelectedPresetKey(newKey);
			try {
				setJSON("last-selected-preset", newKey);
			} catch {}
			if (tabManager.canCreateTab) {
				tabManager.createTab(summary);
			}
		},
		[applyPreset, presetToSummary, tabManager],
	);

	// Load presets on mount
	useEffect(() => {
		const load = async () => {
			setLoadingPresets(true);
			try {
				const data = getPresets();
				const list = mapPresetList(data ?? []);
				setPresets(list);
				try {
					const prev = getJSON<string[]>("recent-presets", []);
					const set = new Set(list.map((p) => p.id ?? p.name));
					const cleaned = prev.filter((k) => set.has(k)).slice(0, 3);
					setJSON("recent-presets", cleaned);
				} catch {}
				if (!selectedPresetKey) {
					const lastKey = getJSON<string>("last-selected-preset", "") || "";
					const pick =
						(lastKey && list.find((p) => (p.id ?? p.name) === lastKey)) ||
						list[0] ||
						null;
					if (pick) {
						const key = pick.id ?? pick.name;
						setSelectedPresetKey(key);
						try {
							setJSON("last-selected-preset", key);
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

	// Apply preset from session storage
	useEffect(() => {
		const applyPresetFromStorage = () => {
			try {
				const stored = sessionStorage.getItem("PC_APPLY_PRESET");
				if (stored) {
					const preset = JSON.parse(stored);
					loadPreset(preset);
					sessionStorage.removeItem("PC_APPLY_PRESET");
				}
			} catch (error) {
				console.error("Failed to apply preset from storage:", error);
			}
		};
		applyPresetFromStorage();
	}, [loadPreset]);

	// Sync component state when active tab changes - CRITICAL for tab isolation
	useEffect(() => {
		const activeTab = tabManager.activeTab;
		if (activeTab?.preset) {
			applyPreset(activeTab.preset, { trackRecent: false });
		}
	}, [tabManager.activeTab?.preset, applyPreset, tabManager.activeTab]);

	// Reload presets when window gains focus (e.g., after editing in Preset Studio)
	useEffect(() => {
		const handleFocus = () => {
			// Reload presets when window gains focus
			const data = getPresets();
			const list = mapPresetList(data ?? []);
			setPresets(list);
		};

		window.addEventListener("focus", handleFocus);
		return () => window.removeEventListener("focus", handleFocus);
	}, []);

	// Listen for preset changes from other tabs/windows via localStorage events
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "PC_PRESETS" && e.newValue) {
				// Presets were updated, reload them
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

	// Update tabs whose presets have been modified
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

	// Auto-show preset picker when no tabs exist
	useEffect(() => {
		if (loadingPresets || presets.length === 0) return;

		if (tabManager.tabs.length > 0) {
			hasAutoShownPresetPicker.current = false;
			return;
		}

		if (!hasAutoShownPresetPicker.current && !showPresetPicker) {
			hasAutoShownPresetPicker.current = true;
			setShowPresetPicker(true);
			setPresetPickerForNewTab(true);
		}
	}, [
		loadingPresets,
		presets.length,
		tabManager.tabs.length,
		showPresetPicker,
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
