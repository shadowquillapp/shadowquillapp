import type {
	GenerationOptions,
	PresetVersion,
	TaskType,
	VersionedPreset,
} from "@/types";
import { getJSON, setJSON } from "./local-storage";

export interface Preset {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: GenerationOptions;
	// Version control fields
	versions?: PresetVersion[];
	currentVersion?: number;
	createdAt?: number;
	updatedAt?: number;
}

// Re-export for backward compatibility
export type { TaskType } from "@/types";

const PRESETS_KEY = "PC_PRESETS";
const MAX_VERSIONS = 10; // Maximum versions to keep per preset

export function getPresets(): Preset[] {
	return getJSON<Preset[]>(PRESETS_KEY, []);
}

/**
 * Get a single preset by ID
 */
export function getPresetById(id: string): Preset | undefined {
	const presets = getPresets();
	return presets.find((p) => p.id === id);
}

/**
 * Get version history for a preset
 */
export function getPresetHistory(presetId: string): PresetVersion[] {
	const preset = getPresetById(presetId);
	return preset?.versions ?? [];
}

/**
 * Rollback a preset to a specific version
 */
export function rollbackPreset(
	presetId: string,
	targetVersion: number,
): Preset | null {
	const list = getPresets();
	const idx = list.findIndex((p) => p.id === presetId);
	if (idx === -1) return null;

	const preset = list[idx];
	if (!preset) return null;

	const version = preset.versions?.find((v) => v.version === targetVersion);
	if (!version) return null;

	// Create a new version entry for the rollback
	const newVersion = createVersionEntry(
		preset,
		`Rolled back to version ${targetVersion}`,
	);

	// Apply the old version's options
	const updatedPreset: Preset = {
		...preset,
		taskType: version.taskType,
		options: { ...version.options },
		versions: [newVersion, ...(preset.versions ?? [])].slice(0, MAX_VERSIONS),
		currentVersion: newVersion.version,
		updatedAt: Date.now(),
	};

	list[idx] = updatedPreset;
	setJSON(PRESETS_KEY, list);

	return updatedPreset;
}

/**
 * Compare two preset versions
 */
export function compareVersions(
	presetId: string,
	versionA: number,
	versionB: number,
): { changed: string[]; added: string[]; removed: string[] } | null {
	const preset = getPresetById(presetId);
	if (!preset?.versions) return null;

	const a = preset.versions.find((v) => v.version === versionA);
	const b = preset.versions.find((v) => v.version === versionB);

	if (!a || !b) return null;

	const keysA = new Set(Object.keys(a.options));
	const keysB = new Set(Object.keys(b.options));

	const changed: string[] = [];
	const added: string[] = [];
	const removed: string[] = [];

	// Find changed and removed
	for (const key of keysA) {
		if (!keysB.has(key)) {
			removed.push(key);
		} else if (
			JSON.stringify(a.options[key as keyof GenerationOptions]) !==
			JSON.stringify(b.options[key as keyof GenerationOptions])
		) {
			changed.push(key);
		}
	}

	// Find added
	for (const key of keysB) {
		if (!keysA.has(key)) {
			added.push(key);
		}
	}

	return { changed, added, removed };
}

/**
 * Create a version entry from current preset state
 */
function createVersionEntry(
	preset: Preset,
	changelog?: string,
): PresetVersion {
	const currentVersion = (preset.currentVersion ?? 0) + 1;
	return {
		version: currentVersion,
		timestamp: Date.now(),
		taskType: preset.taskType,
		options: { ...preset.options },
		...(changelog && { changelog }),
	};
}

/**
 * Get the default presets (without version metadata).
 * This is the single source of truth for default presets.
 */
export function getDefaultPresets(): Preset[] {
	return [
		// General
		{
			id: "quick-answer",
			name: "Quick Answer",
			taskType: "general",
			options: {
				tone: "friendly",
				detail: "brief",
				format: "plain",
				language: "English",
				temperature: 0.6,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
			},
		},
		{
			id: "deep-thinker",
			name: "Deep Thinker",
			taskType: "general",
			options: {
				tone: "neutral",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.7,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "tree_of_thought",
				additionalContext:
					"Approach problems from multiple angles. Consider edge cases, implications, and alternative perspectives before arriving at conclusions.",
			},
		},
		// Coding
		{
			id: "code-architect",
			name: "Code Architect",
			taskType: "coding",
			options: {
				tone: "technical",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.3,
				includeTests: true,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Design scalable, maintainable solutions. Prioritize clean architecture, SOLID principles, and comprehensive error handling.",
			},
		},
		{
			id: "quick-script",
			name: "Quick Script",
			taskType: "coding",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.4,
				includeTests: false,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Write concise, functional code. Focus on getting the job done efficiently.",
			},
		},
		// Image Generation
		{
			id: "photorealistic",
			name: "Photorealistic",
			taskType: "image",
			options: {
				tone: "neutral",
				detail: "detailed",
				format: "plain",
				language: "English",
				temperature: 0.7,
				stylePreset: "photorealistic",
				aspectRatio: "16:9",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create hyperrealistic imagery with natural lighting, accurate textures, and lifelike details. Emphasize depth of field and atmospheric effects.",
			},
		},
		{
			id: "anime-art",
			name: "Anime Art",
			taskType: "image",
			options: {
				tone: "friendly",
				detail: "detailed",
				format: "xml",
				language: "English",
				temperature: 0.8,
				stylePreset: "anime",
				aspectRatio: "16:9",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create vibrant Japanese anime-style artwork with expressive characters and dynamic poses. Include anime aesthetics and manga style elements like hand-drawn style, large eyes, expressive faces, and bold colors.",
			},
		},
		{
			id: "concept-art",
			name: "Concept Art",
			taskType: "image",
			options: {
				tone: "neutral",
				detail: "detailed",
				format: "plain",
				language: "English",
				temperature: 0.75,
				stylePreset: "illustration",
				aspectRatio: "16:9",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Design professional concept art suitable for games, films, or production. Focus on mood, composition, and visual storytelling.",
			},
		},
		// Video Generation
		{
			id: "cinematic-shot",
			name: "Cinematic Shot",
			taskType: "video",
			options: {
				tone: "neutral",
				detail: "detailed",
				format: "plain",
				language: "English",
				temperature: 0.7,
				stylePreset: "cinematic",
				aspectRatio: "16:9",
				cameraMovement: "dolly",
				shotType: "wide",
				durationSeconds: 10,
				frameRate: 24,
				includeStoryboard: true,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create dramatic, film-quality shots with professional cinematography. Emphasize lighting, composition, and emotional impact.",
			},
		},
		{
			id: "social-clip",
			name: "Social Clip",
			taskType: "video",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "xml",
				language: "English",
				temperature: 0.8,
				stylePreset: "vlog",
				aspectRatio: "9:16",
				cameraMovement: "handheld",
				shotType: "medium",
				durationSeconds: 15,
				frameRate: 30,
				includeStoryboard: true,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create engaging vertical video content optimized for TikTok, Reels, and Shorts. Focus on attention-grabbing visuals and dynamic pacing.",
			},
		},
		// Research
		{
			id: "deep-research",
			name: "Deep Research",
			taskType: "research",
			options: {
				tone: "formal",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.4,
				requireCitations: true,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "cot",
				additionalContext:
					"Conduct thorough, academic-quality research. Cite sources, acknowledge limitations, and present balanced analysis with evidence-based conclusions.",
			},
		},
		// Writing
		{
			id: "storyteller",
			name: "Storyteller",
			taskType: "writing",
			options: {
				tone: "friendly",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.9,
				writingStyle: "narrative",
				pointOfView: "third",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Craft immersive narratives with vivid descriptions, compelling characters, and emotional depth. Show, don't tell.",
			},
		},
		{
			id: "blog-writer",
			name: "Blog Writer",
			taskType: "writing",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.75,
				writingStyle: "expository",
				includeHeadings: true,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Write engaging, SEO-friendly blog content with clear structure, scannable formatting, and actionable takeaways.",
			},
		},
		// Marketing
		{
			id: "social-media-pro",
			name: "Social Media Pro",
			taskType: "marketing",
			options: {
				tone: "friendly",
				detail: "brief",
				format: "plain",
				language: "English",
				temperature: 0.85,
				marketingChannel: "social",
				ctaStyle: "soft",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create scroll-stopping social content. Use hooks, trending formats, and authentic voice. Optimize for engagement and shareability.",
			},
		},
		{
			id: "sales-copy",
			name: "Sales Copy",
			taskType: "marketing",
			options: {
				tone: "persuasive",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.7,
				marketingChannel: "landing_page",
				ctaStyle: "strong",
				useDelimiters: true,
				includeVerification: false,
				reasoningStyle: "cot",
				additionalContext:
					"Write high-converting sales copy. Lead with benefits, address objections, build urgency, and drive action with compelling CTAs.",
			},
		},
	];
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

		const now = Date.now();

		// Add version metadata to default presets
		const defaultPresets: Preset[] = getDefaultPresets().map((preset) => ({
			...preset,
			versions: [],
			currentVersion: 0,
			createdAt: now,
			updatedAt: now,
		}));

		// Save all default presets
		setJSON(PRESETS_KEY, defaultPresets);
	} catch {
		// ignore storage errors
	}
}

/**
 * Save a preset with automatic version tracking
 */
export function savePreset(preset: Preset, changelog?: string): Preset {
	const list = getPresets();
	const now = Date.now();

	if (preset.id) {
		const idx = list.findIndex((p) => p.id === preset.id);
		if (idx !== -1) {
			const existing = list[idx];
			if (existing) {
				// Check if options actually changed
				const optionsChanged =
					JSON.stringify(existing.options) !== JSON.stringify(preset.options) ||
					existing.taskType !== preset.taskType;

				// Create version entry if options changed
				let versions = existing.versions ?? [];
				let currentVersion = existing.currentVersion ?? 0;

				if (optionsChanged && existing.options) {
					const versionEntry = createVersionEntry(existing, changelog);
					versions = [versionEntry, ...versions].slice(0, MAX_VERSIONS);
					currentVersion = versionEntry.version;
				}

				const updated: Preset = {
					...existing,
					...preset,
					versions,
					currentVersion,
					createdAt: existing.createdAt ?? now,
					updatedAt: now,
				};
				list[idx] = updated;
				setJSON(PRESETS_KEY, list);
				return updated;
			}
		}
		// New preset with ID provided
		const newPreset: Preset = {
			...preset,
			versions: [],
			currentVersion: 0,
			createdAt: now,
			updatedAt: now,
		};
		list.push(newPreset);
		setJSON(PRESETS_KEY, list);
		return newPreset;
	}

	// If no id provided, attempt to update an existing preset by name (case-insensitive).
	// This supports legacy presets without ids and prevents accidental duplicates on same-name save.
	const normalizedName = (preset.name || "").trim().toLowerCase();
	const existingIndexByName = list.findIndex(
		(p) => (p.name || "").trim().toLowerCase() === normalizedName,
	);
	if (existingIndexByName !== -1) {
		const existing = list[existingIndexByName];
		if (existing) {
			const id =
				existing.id ??
				`preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

			// Check if options actually changed
			const optionsChanged =
				JSON.stringify(existing.options) !== JSON.stringify(preset.options) ||
				existing.taskType !== preset.taskType;

			// Create version entry if options changed
			let versions = existing.versions ?? [];
			let currentVersion = existing.currentVersion ?? 0;

			if (optionsChanged && existing.options) {
				const versionEntry = createVersionEntry(existing, changelog);
				versions = [versionEntry, ...versions].slice(0, MAX_VERSIONS);
				currentVersion = versionEntry.version;
			}

			const updated: Preset = {
				...existing,
				...preset,
				id,
				versions,
				currentVersion,
				createdAt: existing.createdAt ?? now,
				updatedAt: now,
			};
			list[existingIndexByName] = updated;
			setJSON(PRESETS_KEY, list);
			return updated;
		}
	}

	// Brand new preset
	const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const newPreset: Preset = {
		...preset,
		id,
		versions: [],
		currentVersion: 0,
		createdAt: now,
		updatedAt: now,
	};
	list.push(newPreset);
	setJSON(PRESETS_KEY, list);
	return newPreset;
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

/**
 * Export preset with full version history
 */
export function exportPresetWithHistory(presetId: string): VersionedPreset | null {
	const preset = getPresetById(presetId);
	if (!preset) return null;

	return {
		...(preset.id && { id: preset.id }),
		name: preset.name,
		taskType: preset.taskType,
		...(preset.options && { options: preset.options }),
		...(preset.versions && { versions: preset.versions }),
		...(preset.currentVersion !== undefined && { currentVersion: preset.currentVersion }),
		...(preset.createdAt !== undefined && { createdAt: preset.createdAt }),
		...(preset.updatedAt !== undefined && { updatedAt: preset.updatedAt }),
	};
}

/**
 * Import preset with version history
 */
export function importPresetWithHistory(
	presetData: VersionedPreset,
	options?: { overwrite?: boolean },
): Preset {
	const list = getPresets();
	const now = Date.now();

	// Check if preset with same ID exists
	if (presetData.id && options?.overwrite !== false) {
		const existingIdx = list.findIndex((p) => p.id === presetData.id);
		if (existingIdx !== -1) {
			// Update existing preset
			const updated: Preset = {
				...presetData,
				updatedAt: now,
			};
			list[existingIdx] = updated;
			setJSON(PRESETS_KEY, list);
			return updated;
		}
	}

	// Create new preset with new ID
	const newId = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const newPreset: Preset = {
		...presetData,
		id: newId,
		createdAt: now,
		updatedAt: now,
	};
	list.push(newPreset);
	setJSON(PRESETS_KEY, list);
	return newPreset;
}
