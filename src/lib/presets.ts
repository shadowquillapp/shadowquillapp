import { getJSON, setJSON } from "./local-storage";

export type TaskType = "general" | "coding" | "image" | "research" | "writing" | "marketing" | "video";

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
 * Ensure default presets exist in local storage.
 * Idempotent: will not create duplicates.
 */
export function ensureDefaultPreset(): void {
	try {
		const list = getPresets();
		// If any presets exist, don't add defaults
		if (list.length > 0) return;
		
		// Create comprehensive default presets
		const defaultPresets: Preset[] = [
			{
				id: 'general-assistant',
				name: 'General Assistant',
				taskType: 'general',
				options: {
					tone: 'friendly',
					detail: 'normal',
					format: 'markdown',
					language: 'English',
					temperature: 0.7,
					useDelimiters: true,
					includeVerification: false,
					reasoningStyle: 'cot',
					endOfPromptToken: '<|endofprompt|>',
					additionalContext: 'You are a helpful AI assistant. Provide clear, accurate, and well-structured responses. Use examples when helpful.',
				},
			},
			{
				id: 'code-expert',
				name: 'Code Expert',
				taskType: 'coding',
				options: {
					tone: 'technical',
					detail: 'detailed',
					format: 'markdown',
					language: 'English',
					temperature: 0.4,
					includeTests: true,
					useDelimiters: true,
					includeVerification: true,
					reasoningStyle: 'plan_then_solve',
					endOfPromptToken: '<|endofprompt|>',
					additionalContext: 'Write clean, well-documented code following best practices. Include error handling, type safety, and comprehensive test cases. Explain your implementation choices.',
				},
			},
			{
				id: 'creative-writer',
				name: 'Creative Writer',
				taskType: 'writing',
				options: {
					tone: 'friendly',
					detail: 'detailed',
					format: 'markdown',
					language: 'English',
					temperature: 0.85,
					useDelimiters: false,
					includeVerification: false,
					reasoningStyle: 'none',
					endOfPromptToken: '<|endofprompt|>',
					additionalContext: 'Write engaging, creative content with vivid descriptions and natural flow. Focus on storytelling, emotion, and reader engagement.',
				},
			},
			{
				id: 'research-analyst',
				name: 'Research Analyst',
				taskType: 'research',
				options: {
					tone: 'formal',
					detail: 'detailed',
					format: 'markdown',
					language: 'English',
					temperature: 0.5,
					requireCitations: true,
					useDelimiters: true,
					includeVerification: true,
					reasoningStyle: 'cot',
					endOfPromptToken: '<|endofprompt|>',
					additionalContext: 'Provide thorough, well-researched analysis with proper citations. Be objective, evidence-based, and comprehensive. Verify facts and acknowledge limitations.',
				},
			},
			{
				id: 'technical-writer',
				name: 'Technical Writer',
				taskType: 'writing',
				options: {
					tone: 'technical',
					detail: 'detailed',
					format: 'markdown',
					language: 'English',
					temperature: 0.3,
					useDelimiters: true,
					includeVerification: true,
					reasoningStyle: 'plan_then_solve',
					endOfPromptToken: '<|endofprompt|>',
					additionalContext: 'Create clear, precise technical documentation. Use consistent terminology, proper formatting, and logical structure. Include examples, diagrams descriptions, and troubleshooting steps where relevant.',
				},
			},
			{
				id: 'marketing-expert',
				name: 'Marketing Expert',
				taskType: 'marketing',
				options: {
					tone: 'persuasive',
					detail: 'normal',
					format: 'markdown',
					language: 'English',
					temperature: 0.8,
					useDelimiters: true,
					includeVerification: false,
					reasoningStyle: 'cot',
					endOfPromptToken: '<|endofprompt|>',
					additionalContext: 'Create compelling marketing copy that resonates with target audiences. Focus on benefits, emotional appeal, and clear calls-to-action. Use persuasive techniques while maintaining authenticity.',
				},
			},
		];
		
		// Save all default presets
		setJSON(PRESETS_KEY, defaultPresets);
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
			if (existing) {
				const id = existing.id ?? `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
				const updated = { ...existing, ...preset, id };
				list[existingIndexByName] = updated;
				preset = updated;
			} else {
				const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
				list.push({ ...preset, id });
				preset = { ...preset, id };
			}
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


