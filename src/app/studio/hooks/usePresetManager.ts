import { generatePresetExamples, generateSingleExample } from "@/lib/example-generator";
import { getDefaultPresets } from "@/lib/presets";
import type { PresetLite } from "@/types";
import { useCallback, useState } from "react";

const STORAGE_KEY = "PC_PRESETS";

export function usePresetManager() {
	const [presets, setPresets] = useState<PresetLite[]>([]);
	const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
	const [regeneratingIndex, setRegeneratingIndex] = useState<0 | 1 | null>(null);

	// Load presets from localStorage
	const loadPresets = useCallback(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Ensure each preset has an ID
				const presetsWithIds = parsed.map((preset: PresetLite) => ({
					...preset,
					id:
						preset.id ||
						`preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				}));
				setPresets(presetsWithIds);
			} else {
				// Create default presets if none exist
				const defaultPresets = getDefaultPresets();
				setPresets(defaultPresets);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPresets));
			}
		} catch (error) {
			console.error("Failed to load presets:", error);
			setPresets([]);
		}
	}, []);

	// Save preset (create or update) - examples are generated manually via generateExamplesOnly
	const savePreset = useCallback(
		async (preset: PresetLite): Promise<PresetLite> => {
			try {
				const existing = presets.find((p) => p.id === preset.id);
				let updatedPresets: PresetLite[];
				let savedPreset: PresetLite;

			if (existing) {
				// Update existing preset, preserve existing examples
				const presetToSave: PresetLite = {
					...preset,
					...(existing.generatedExamples && { generatedExamples: existing.generatedExamples }),
				};
					updatedPresets = presets.map((p) =>
						p.id === preset.id ? presetToSave : p,
					);
					savedPreset = presetToSave;
				} else {
					// Add new preset with generated ID if needed
					const newPreset: PresetLite = {
						...preset,
						id:
							preset.id ||
							`preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					};
					updatedPresets = [...presets, newPreset];
					savedPreset = newPreset;
				}

				localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
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
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
				setPresets(updatedPresets);
			} catch (error) {
				console.error("Failed to delete preset:", error);
				throw error;
			}
		},
		[presets],
	);

	// Duplicate preset (copies examples from original)
	const duplicatePreset = useCallback(
		async (presetId: string) => {
			try {
				const original = presets.find((p) => p.id === presetId);
				if (!original) return null;

				// Create duplicate without generatedExamples so they get regenerated on next save
				const duplicated: PresetLite = {
					id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					name: `${original.name} Copy`,
					taskType: original.taskType,
					options: { ...original.options },
				};

				const updatedPresets = [...presets, duplicated];
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
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
					.map((p: PresetLite) => ({
						...p,
						id:
							p.id ||
							`preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					}));

				const updatedPresets = [...presets, ...newPresets];
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
				setPresets(updatedPresets);

				return newPresets.length;
			} catch (error) {
				console.error("Failed to import presets:", error);
				throw error;
			}
		},
		[presets],
	);

	// Generate examples for a preset without saving (updates in-memory and storage)
	const generateExamplesOnly = useCallback(
		async (preset: PresetLite): Promise<PresetLite | null> => {
			if (!preset.id) return null;
			
			setIsGeneratingExamples(true);
			try {
				const examples = await generatePresetExamples(preset);
				const presetWithExamples: PresetLite = {
					...preset,
					generatedExamples: examples,
				};

				// Update in presets array and localStorage
				const updatedPresets = presets.map((p) =>
					p.id === preset.id ? presetWithExamples : p,
				);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
				setPresets(updatedPresets);

				return presetWithExamples;
			} catch (error) {
				console.error("Failed to generate examples:", error);
				return null;
			} finally {
				setIsGeneratingExamples(false);
			}
		},
		[presets],
	);

	// Regenerate a single example at the given index (0 or 1)
	const regenerateExample = useCallback(
		async (preset: PresetLite, index: 0 | 1): Promise<PresetLite | null> => {
			if (!preset.id || !preset.generatedExamples) return null;
			
			setRegeneratingIndex(index);
			try {
				const newExample = await generateSingleExample(preset);
				
				// Create updated examples array
				const updatedExamples: [typeof newExample, typeof newExample] = 
					index === 0 
						? [newExample, preset.generatedExamples[1]]
						: [preset.generatedExamples[0], newExample];
				
				const presetWithExamples: PresetLite = {
					...preset,
					generatedExamples: updatedExamples,
				};

				// Update in presets array and localStorage
				const updatedPresets = presets.map((p) =>
					p.id === preset.id ? presetWithExamples : p,
				);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
				setPresets(updatedPresets);

				return presetWithExamples;
			} catch (error) {
				console.error("Failed to regenerate example:", error);
				return null;
			} finally {
				setRegeneratingIndex(null);
			}
		},
		[presets],
	);

	return {
		presets,
		isGeneratingExamples,
		regeneratingIndex,
		loadPresets,
		savePreset,
		deletePreset,
		duplicatePreset,
		exportPresets,
		importPresets,
		generateExamplesOnly,
		regenerateExample,
	};
}
