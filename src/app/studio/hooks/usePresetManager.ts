import { useCallback, useState } from "react";
import { getJSON, setJSON } from "@/lib/local-storage";
import { getDefaultPresets } from "@/lib/presets";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { PresetLite } from "@/types";

const STORAGE_KEY = STORAGE_KEYS.PRESETS.key;

function sanitizeStudioPreset(preset: PresetLite): PresetLite {
	const { generatedExamples: _removedExamples, ...withoutGeneratedExamples } =
		preset as PresetLite & { generatedExamples?: unknown };
	let result =
		"generatedExamples" in preset
			? (withoutGeneratedExamples as PresetLite)
			: preset;

	if (result.options && "temperature" in result.options) {
		const { temperature: _removedTemp, ...options } =
			result.options as PresetLite["options"] & { temperature?: number };
		result = { ...result, options };
	}

	return result;
}

export function usePresetManager() {
	const [presets, setPresets] = useState<PresetLite[]>([]);

	// Load presets from storage
	const loadPresets = useCallback(() => {
		try {
			const parsed = getJSON<PresetLite[]>(STORAGE_KEY, null);
			if (parsed && Array.isArray(parsed)) {
				// Ensure each preset has an ID
				const presetsWithIds = parsed.map((preset: PresetLite) =>
					sanitizeStudioPreset({
						...preset,
						id:
							preset.id ||
							`preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					}),
				);
				setPresets(presetsWithIds);
			} else {
				// Create default presets if none exist
				const defaultPresets = getDefaultPresets();
				setPresets(defaultPresets);
				setJSON(STORAGE_KEY, defaultPresets);
			}
		} catch (error) {
			console.error("Failed to load presets:", error);
			setPresets([]);
		}
	}, []);

	// Save preset (create or update)
	const savePreset = useCallback(
		async (preset: PresetLite): Promise<PresetLite> => {
			try {
				const existing = presets.find((p) => p.id === preset.id);
				let updatedPresets: PresetLite[];
				let savedPreset: PresetLite;

				if (existing) {
					const presetToSave = sanitizeStudioPreset(preset);
					updatedPresets = presets.map((p) =>
						p.id === preset.id ? presetToSave : p,
					);
					savedPreset = presetToSave;
				} else {
					const newPreset = sanitizeStudioPreset({
						...preset,
						id:
							preset.id ||
							`preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					});
					updatedPresets = [...presets, newPreset];
					savedPreset = newPreset;
				}

				setJSON(STORAGE_KEY, updatedPresets);
				setPresets(updatedPresets);
				return savedPreset;
			} catch (error) {
				console.error("Failed to save preset:", error);
				throw error;
			}
		},
		[presets],
	);

	// Delete preset
	const deletePreset = useCallback(
		async (presetId: string) => {
			try {
				const updatedPresets = presets.filter((p) => p.id !== presetId);
				setJSON(STORAGE_KEY, updatedPresets);
				setPresets(updatedPresets);
			} catch (error) {
				console.error("Failed to delete preset:", error);
				throw error;
			}
		},
		[presets],
	);

	// Duplicate preset
	const duplicatePreset = useCallback(
		async (presetId: string) => {
			try {
				const original = presets.find((p) => p.id === presetId);
				if (!original) return null;

				const duplicated: PresetLite = {
					id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					name: `${original.name} Copy`,
					taskType: original.taskType,
					options: { ...original.options },
				};

				const updatedPresets = [...presets, duplicated];
				setJSON(STORAGE_KEY, updatedPresets);
				setPresets(updatedPresets);
				return duplicated;
			} catch (error) {
				console.error("Failed to duplicate preset:", error);
				return null;
			}
		},
		[presets],
	);

	// Export presets
	const exportPresets = useCallback(() => {
		try {
			const dataStr = JSON.stringify(presets, null, 2);
			const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

			const exportFileDefaultName = `presets_${new Date().toISOString().split("T")[0]}.json`;

			const linkElement = document.createElement("a");
			linkElement.setAttribute("href", dataUri);
			linkElement.setAttribute("download", exportFileDefaultName);
			linkElement.click();
		} catch (error) {
			console.error("Failed to export presets:", error);
			throw error;
		}
	}, [presets]);

	// Import presets
	const importPresets = useCallback(
		async (file: File) => {
			try {
				const text = await file.text();
				const imported = JSON.parse(text);

				if (!Array.isArray(imported)) {
					throw new Error("Invalid preset file format");
				}

				// Merge with existing presets, avoiding duplicates
				const existingIds = new Set(presets.map((p) => p.id));
				const newPresets = imported
					.filter((p: PresetLite) => !existingIds.has(p.id || ""))
					.map((p: PresetLite) =>
						sanitizeStudioPreset({
							...p,
							id:
								p.id ||
								`preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						}),
					);

				const updatedPresets = [...presets, ...newPresets];
				setJSON(STORAGE_KEY, updatedPresets);
				setPresets(updatedPresets);

				return newPresets.length;
			} catch (error) {
				console.error("Failed to import presets:", error);
				throw error;
			}
		},
		[presets],
	);

	return {
		presets,
		loadPresets,
		savePreset,
		deletePreset,
		duplicatePreset,
		exportPresets,
		importPresets,
	};
}
