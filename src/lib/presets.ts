import { getJSON, setJSON } from "./local-storage";

export type TaskType = "general" | "coding" | "image" | "research" | "writing" | "marketing";

export interface Preset {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: any;
}

const PRESETS_KEY = "PC_PRESETS";

export function getPresets(): Preset[] {
	return getJSON<Preset[]>(PRESETS_KEY, []);
}

/**
 * Ensure a 'Default' preset exists in local storage.
 * Idempotent: will not create duplicates.
 */
export function ensureDefaultPreset(): void {
	try {
		const list = getPresets();
		const hasDefault = list.some((p) => (p.name || '').trim().toLowerCase() === 'default');
		if (hasDefault) return;
		savePreset({
			name: 'Default',
			taskType: 'general',
			options: {},
		});
	} catch {
		// ignore storage errors
	}
}

export function savePreset(preset: Preset): Preset {
	const list = getPresets();
	if (preset.id) {
		const idx = list.findIndex((p) => p.id === preset.id);
		if (idx !== -1) {
			list[idx] = { ...list[idx], ...preset };
		} else {
			list.push(preset);
		}
	} else {
		// If no id provided, attempt to update an existing preset by name (case-insensitive).
		// This supports legacy presets without ids and prevents accidental duplicates on same-name save.
		const normalizedName = (preset.name || "").trim().toLowerCase();
		const existingIndexByName = list.findIndex((p) => (p.name || "").trim().toLowerCase() === normalizedName);
		if (existingIndexByName !== -1) {
			const existing = list[existingIndexByName];
			const id = existing.id ?? `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const updated = { ...existing, ...preset, id };
			list[existingIndexByName] = updated;
			preset = updated;
		} else {
			const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			list.push({ ...preset, id });
			preset = { ...preset, id };
		}
	}
	setJSON(PRESETS_KEY, list);
	return preset;
}

export function deletePresetByIdOrName(id?: string, name?: string): void {
	const list = getPresets();
	const filtered = list.filter((p) => {
		if (id) return p.id !== id;
		if (name) return p.name !== name;
		return true;
	});
	setJSON(PRESETS_KEY, filtered);
}


