import { useCallback, useState } from "react";
import {
	deletePresetByIdOrName,
	ensureDefaultPreset,
	getPresets,
	type Preset,
	savePreset,
} from "@/lib/presets";
import type { PresetLite } from "@/types";

export function usePresetManager() {
	const [presets, setPresets] = useState<PresetLite[]>([]);

	const loadPresets = useCallback(() => {
		try {
			ensureDefaultPreset();
			setPresets(getPresets());
		} catch (error) {
			console.error("Failed to load presets:", error);
			setPresets([]);
		}
	}, []);

	const savePresetHandler = useCallback(
		async (preset: PresetLite): Promise<PresetLite> => {
			try {
				const saved = savePreset(preset as Preset);
				const list = getPresets();
				setPresets(list);
				return saved;
			} catch (error) {
				console.error("Failed to save preset:", error);
				throw error;
			}
		},
		[],
	);

	const deletePreset = useCallback(async (presetId: string) => {
		try {
			deletePresetByIdOrName(presetId);
			setPresets(getPresets());
		} catch (error) {
			console.error("Failed to delete preset:", error);
			throw error;
		}
	}, []);

	return {
		presets,
		loadPresets,
		savePreset: savePresetHandler,
		deletePreset,
	};
}
