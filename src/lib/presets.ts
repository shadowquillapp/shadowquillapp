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
		// General productivity
		{
			id: "daily-assistant",
			name: "Daily Assistant",
			taskType: "general",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.65,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Act as a proactive executive assistant. Ask clarifying questions when requirements are ambiguous, suggest next steps, and present answers with concise bullet points plus a short recommendation.",
			},
		},
		{
			id: "brainstorm-partner",
			name: "Brainstorm Partner",
			taskType: "general",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.85,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "tree_of_thought",
				additionalContext:
					"Generate diverse idea sets. Label quick wins vs bold bets, highlight required resources, and combine compatible ideas into themed clusters.",
			},
		},
		{
			id: "smart-summarizer",
			name: "Smart Summaries",
			taskType: "general",
			options: {
				tone: "neutral",
				detail: "brief",
				format: "markdown",
				language: "English",
				temperature: 0.35,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Turn long-form content into layered summaries. Always include sections for Key Takeaways, Action Items with owners, and Open Questions.",
			},
		},
		{
			id: "meeting-notes",
			name: "Meeting Minutes",
			taskType: "general",
			options: {
				tone: "formal",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.4,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Organize raw meeting notes into a structured report with attendees, agenda, decisions, risks, and action items (owner + due date). Highlight blockers and follow-ups.",
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
					"Design scalable, maintainable solutions. Outline architecture, data contracts, failure modes, and provide pseudocode before final implementation.",
			},
		},
		{
			id: "bug-fixer",
			name: "Bug Fixer",
			taskType: "coding",
			options: {
				tone: "technical",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.25,
				includeTests: true,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Diagnose and resolve defects. Summarize reproduction steps, root cause analysis, patch strategy, and regression tests to run.",
			},
		},
		{
			id: "code-explainer",
			name: "Code Explainer",
			taskType: "coding",
			options: {
				tone: "friendly",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.35,
				includeTests: false,
				useDelimiters: false,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Explain codebases to cross-functional teammates. Break down what the code does, why it was implemented that way, and opportunities for improvement.",
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
				readingLevel: "intermediate",
				targetWordCount: 900,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Craft immersive narratives with vivid descriptions, compelling characters, and emotional depth. Show, don't tell, and end with a memorable hook.",
			},
		},
		{
			id: "blog-writer",
			name: "Blog Writer",
			taskType: "writing",
			options: {
				tone: "friendly",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.75,
				writingStyle: "expository",
				readingLevel: "intermediate",
				includeHeadings: true,
				targetWordCount: 1200,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Produce SEO-friendly blog posts with a compelling hook, outline-driven sections, scannable formatting, and actionable takeaways.",
			},
		},
		{
			id: "inbox-zero",
			name: "Inbox Zero",
			taskType: "writing",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "plain",
				language: "English",
				temperature: 0.45,
				writingStyle: "expository",
				pointOfView: "second",
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Draft concise professional emails. Include a subject line, greeting, body (with bullets when helpful), and a clear call to action or next step.",
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
					"Conduct thorough, academic-quality research. Provide sections for Executive Summary, Evidence, Counterpoints, Risks, and Recommendations, citing reputable sources.",
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
				format: "markdown",
				language: "English",
				temperature: 0.85,
				marketingChannel: "social",
				ctaStyle: "soft",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create platform-ready social posts. Provide hook, caption, CTA, hashtags, and a suggested visual concept tailored for the intended platform.",
			},
		},
		{
			id: "launch-copy",
			name: "Launch Copy",
			taskType: "marketing",
			options: {
				tone: "persuasive",
				detail: "detailed",
				format: "markdown",
				language: "English",
				temperature: 0.65,
				marketingChannel: "landing_page",
				ctaStyle: "strong",
				useDelimiters: true,
				includeVerification: false,
				reasoningStyle: "cot",
				valueProps:
					"Highlight ROI, proof points, social validation, and risk reversal.",
				additionalContext:
					"Write conversion-focused launch copy with sections for Hero, Problem, Solution, Benefits, Proof, Pricing, FAQ, and CTA.",
			},
		},
		// Image generation
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
				targetResolution: "1080p",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create cinematic, high-fidelity imagery with natural lighting, accurate materials, subtle imperfections, and depth-of-field for realism.",
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
				targetResolution: "1080p",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Deliver production-ready concept art that emphasizes mood, silhouettes, and storytelling suitable for films or games.",
			},
		},
		// Video generation
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
				targetResolution: "1080p",
				cameraMovement: "handheld",
				shotType: "medium",
				durationSeconds: 15,
				frameRate: 30,
				includeStoryboard: true,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Outline a punchy vertical video with hook, beats, b-roll ideas, captions, and CTA optimized for TikTok, Reels, or Shorts.",
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
