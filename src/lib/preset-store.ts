import type { PresetLite } from "@/types";
import { getRaw, setJSON } from "./local-storage";
import { getPresets, type Preset } from "./presets";
import { isArrayOf, isString, safeParse } from "./schema";
import { STORAGE_KEYS } from "./storage-keys";

export type PresetSummary = PresetLite;

export const presetKey = (preset: Pick<PresetSummary, "id" | "name">) =>
	preset.id ?? preset.name;

export function mapPresetToSummary(preset: PresetSummary): PresetSummary {
	return {
		...(preset.id && { id: preset.id }),
		name: preset.name,
		taskType: preset.taskType,
		...(preset.options && { options: preset.options }),
	};
}

export function mapPresetList(
	presets: Preset[] = getPresets(),
): PresetSummary[] {
	return presets.map(mapPresetToSummary);
}

export function getRecentPresetKeys(): string[] {
	return safeParse(
		getRaw(STORAGE_KEYS.RECENT_PRESETS.key),
		(v): v is string[] => isArrayOf(v, isString),
		[],
	);
}

export function setRecentPresetKeys(keys: string[]): void {
	setJSON(STORAGE_KEYS.RECENT_PRESETS.key, keys.slice(0, 3));
}

export function trackRecentPreset(preset: PresetSummary): void {
	const key = presetKey(preset);
	setRecentPresetKeys([key, ...getRecentPresetKeys().filter((k) => k !== key)]);
}

export function pruneRecentPresets(presets: PresetSummary[]): void {
	const valid = new Set(presets.map(presetKey));
	setRecentPresetKeys(getRecentPresetKeys().filter((key) => valid.has(key)));
}

export function getLastSelectedPresetKey(): string {
	return safeParse(getRaw(STORAGE_KEYS.LAST_SELECTED_PRESET.key), isString, "");
}

export function setLastSelectedPresetKey(key: string): void {
	setJSON(STORAGE_KEYS.LAST_SELECTED_PRESET.key, key);
}
