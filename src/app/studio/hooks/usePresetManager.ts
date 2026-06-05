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

	const duplicatePreset = useCallback(async (presetId: string) => {
		try {
			const original = getPresets().find((p) => p.id === presetId);
			if (!original) return null;

			const { id: _removed, createdAt: _c, updatedAt: _u, ...rest } = original;
			const duplicated = savePreset({
				...rest,
				name: `${original.name} Copy`,
			} as Preset);

			setPresets(getPresets());
			return duplicated;
		} catch (error) {
			console.error("Failed to duplicate preset:", error);
			return null;
		}
	}, []);

	return {
		presets,
		loadPresets,
		savePreset: savePresetHandler,
		deletePreset,
		duplicatePreset,
	};
}
