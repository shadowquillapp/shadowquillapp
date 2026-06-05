import type {
	GenerationOptions,
	PresetLite,
	PresetVersion,
	TaskType,
	VersionedPreset,
} from "@/types";
import { getRaw, setJSON } from "../local-storage";
import { isOneOf, isRecord, isString, safeParse } from "../schema";
import { STORAGE_KEYS } from "../storage-keys";

export interface Preset extends PresetLite {
	versions?: PresetVersion[];
	currentVersion?: number;
	createdAt?: number;
	updatedAt?: number;
}

const MAX_VERSIONS = 10;

function sanitizePresetOptions(options: GenerationOptions): GenerationOptions {
	const sanitized = { ...options } as GenerationOptions & {
		temperature?: number;
	};
	delete sanitized.temperature;
	return sanitized;
}

function sanitizePreset(preset: Preset): Preset {
	const { generatedExamples: _removedExamples, ...withoutGeneratedExamples } =
		preset as Preset & { generatedExamples?: unknown };
	const base =
		"generatedExamples" in preset
			? (withoutGeneratedExamples as Preset)
			: preset;
	if (!base.options) return base;
	return { ...base, options: sanitizePresetOptions(base.options) };
}
const TASK_TYPES: readonly TaskType[] = [
	"general",
	"coding",
	"image",
	"research",
	"writing",
	"marketing",
	"video",
];

function isPreset(v: unknown): v is Preset {
	return (
		isRecord(v) &&
		isString(v.name) &&
		isOneOf(v.taskType, TASK_TYPES) &&
		(v.options === undefined || isRecord(v.options))
	);
}

function isPresetArray(v: unknown): v is Preset[] {
	return Array.isArray(v) && v.every(isPreset);
}

export function parsePreset(raw: string | null): Preset | null {
	return safeParse(raw, isPreset, null);
}

export function getPresets(): Preset[] {
	const list = safeParse(getRaw(STORAGE_KEYS.PRESETS.key), isPresetArray, []);
	return list.map(sanitizePreset);
}

function writePresets(list: Preset[]): void {
	setJSON(STORAGE_KEYS.PRESETS.key, list);
}

export function getPresetById(id: string): Preset | undefined {
	return getPresets().find((p) => p.id === id);
}

export function getDefaultPresets(): Preset[] {
	return [
		{
			id: "daily-assistant",
			name: "Daily Helper",
			taskType: "general",
			options: {
				tone: "friendly",
				detail: "brief",
				format: "markdown",
				language: "English",
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Act as a helpful assistant for everyday tasks. Provide clear, actionable answers with bullet points when appropriate.",
			},
		},
		{
			id: "quick-summarizer",
			name: "Quick Summary",
			taskType: "general",
			options: {
				tone: "neutral",
				detail: "brief",
				format: "markdown",
				language: "English",
				useDelimiters: true,
				includeVerification: false,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Create concise summaries of content. Extract key points and main ideas in a clean, scannable format.",
			},
		},
		{
			id: "code-helper",
			name: "Code Helper",
			taskType: "coding",
			options: {
				tone: "technical",
				detail: "brief",
				format: "markdown",
				language: "English",
				includeTests: false,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Assist with coding tasks. Provide clean, working code with brief explanations. Focus on practical solutions.",
			},
		},
		{
			id: "bug-hunter",
			name: "Bug Hunter",
			taskType: "coding",
			options: {
				tone: "technical",
				detail: "brief",
				format: "markdown",
				language: "English",
				includeTests: true,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Diagnose and fix bugs systematically. Include reproduction steps, root cause analysis, solution implementation, and test cases to prevent regression.",
			},
		},
		{
			id: "email-drafter",
			name: "Email Draft",
			taskType: "writing",
			options: {
				tone: "friendly",
				detail: "brief",
				format: "plain",
				language: "English",
				writingStyle: "expository",
				pointOfView: "second",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Draft professional emails quickly. Keep them concise and clear with a subject line and appropriate greeting.",
			},
		},
		{
			id: "research-assistant",
			name: "Research Assistant",
			taskType: "research",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				requireCitations: true,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "cot",
				additionalContext:
					"Help with research tasks. Present findings clearly with proper citations and balanced perspectives on the topic.",
			},
		},
		{
			id: "deep-analyst",
			name: "Deep Analyst",
			taskType: "research",
			options: {
				tone: "formal",
				detail: "detailed",
				format: "markdown",
				language: "English",
				requireCitations: true,
				useDelimiters: true,
				includeVerification: true,
				reasoningStyle: "cot",
				additionalContext:
					"Conduct comprehensive analysis with academic rigor. Provide executive summary, detailed evidence, counterarguments, risk assessment, and well-supported recommendations with citations.",
			},
		},
		{
			id: "social-post",
			name: "Social Post",
			taskType: "marketing",
			options: {
				tone: "friendly",
				detail: "brief",
				format: "markdown",
				language: "English",
				marketingChannel: "social",
				ctaStyle: "soft",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Create engaging social media posts. Include hook, main content, relevant hashtags, and optional call-to-action.",
			},
		},
		{
			id: "image-creator",
			name: "Image Creator",
			taskType: "image",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				stylePreset: "photorealistic",
				aspectRatio: "16:9",
				targetResolution: "1080p",
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "none",
				additionalContext:
					"Generate detailed image prompts for AI image generation. Describe subjects, composition, lighting, mood, and style clearly.",
			},
		},
		{
			id: "video-creator",
			name: "Video Creator",
			taskType: "video",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				stylePreset: "cinematic",
				aspectRatio: "16:9",
				targetResolution: "1080p",
				cameraMovement: "dolly",
				shotType: "medium",
				durationSeconds: 10,
				frameRate: 30,
				includeStoryboard: false,
				useDelimiters: false,
				includeVerification: false,
				reasoningStyle: "plan_then_solve",
				additionalContext:
					"Generate video prompts for AI video generation. Describe scene, action, camera work, and visual flow clearly.",
			},
		},
	];
}

export function ensureDefaultPreset(): void {
	const list = getPresets();
	if (list.length > 0) return;
	const now = Date.now();
	writePresets(
		getDefaultPresets().map((preset) => ({
			...preset,
			versions: [],
			currentVersion: 0,
			createdAt: now,
			updatedAt: now,
		})),
	);
}

function makeVersionEntry(preset: Preset, changelog?: string): PresetVersion {
	const currentVersion = (preset.currentVersion ?? 0) + 1;
	return {
		version: currentVersion,
		timestamp: Date.now(),
		taskType: preset.taskType,
		options: { ...preset.options } as GenerationOptions,
		...(changelog && { changelog }),
	};
}

function optionsEqual(
	a: GenerationOptions | undefined,
	b: GenerationOptions | undefined,
): boolean {
	return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function savePreset(preset: Preset, changelog?: string): Preset {
	const normalizedPreset = sanitizePreset(preset);
	const list = getPresets();
	const now = Date.now();

	if (normalizedPreset.id) {
		const idx = list.findIndex((p) => p.id === normalizedPreset.id);
		if (idx !== -1) {
			const existing = list[idx];
			if (existing) {
				const changed =
					!optionsEqual(existing.options, normalizedPreset.options) ||
					existing.taskType !== normalizedPreset.taskType;
				let versions = existing.versions ?? [];
				let currentVersion = existing.currentVersion ?? 0;
				if (changed && existing.options) {
					const entry = makeVersionEntry(existing, changelog);
					versions = [entry, ...versions].slice(0, MAX_VERSIONS);
					currentVersion = entry.version;
				}
				const updated: Preset = {
					...existing,
					...normalizedPreset,
					versions,
					currentVersion,
					createdAt: existing.createdAt ?? now,
					updatedAt: now,
				};
				list[idx] = updated;
				writePresets(list);
				return updated;
			}
		}
		const newPreset: Preset = {
			...normalizedPreset,
			versions: [],
			currentVersion: 0,
			createdAt: now,
			updatedAt: now,
		};
		list.push(newPreset);
		writePresets(list);
		return newPreset;
	}

	const normalized = (normalizedPreset.name || "").trim().toLowerCase();
	const byNameIdx = list.findIndex(
		(p) => (p.name || "").trim().toLowerCase() === normalized,
	);
	if (byNameIdx !== -1) {
		const existing = list[byNameIdx];
		if (existing) {
			const id =
				existing.id ??
				`preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const changed =
				!optionsEqual(existing.options, normalizedPreset.options) ||
				existing.taskType !== normalizedPreset.taskType;
			let versions = existing.versions ?? [];
			let currentVersion = existing.currentVersion ?? 0;
			if (changed && existing.options) {
				const entry = makeVersionEntry(existing, changelog);
				versions = [entry, ...versions].slice(0, MAX_VERSIONS);
				currentVersion = entry.version;
			}
			const updated: Preset = {
				...existing,
				...normalizedPreset,
				id,
				versions,
				currentVersion,
				createdAt: existing.createdAt ?? now,
				updatedAt: now,
			};
			list[byNameIdx] = updated;
			writePresets(list);
			return updated;
		}
	}

	const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const newPreset: Preset = {
		...normalizedPreset,
		id,
		versions: [],
		currentVersion: 0,
		createdAt: now,
		updatedAt: now,
	};
	list.push(newPreset);
	writePresets(list);
	return newPreset;
}

export function deletePresetByIdOrName(id?: string, name?: string): void {
	const list = getPresets().filter((p) => {
		if (id) return p.id !== id;
		if (name) return p.name !== name;
		return true;
	});
	writePresets(list);
}

export function getPresetHistory(presetId: string): PresetVersion[] {
	return getPresetById(presetId)?.versions ?? [];
}

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
	const newVersion = makeVersionEntry(
		preset,
		`Rolled back to version ${targetVersion}`,
	);
	const updatedPreset: Preset = {
		...preset,
		taskType: version.taskType,
		options: { ...version.options },
		versions: [newVersion, ...(preset.versions ?? [])].slice(0, MAX_VERSIONS),
		currentVersion: newVersion.version,
		updatedAt: Date.now(),
	};
	list[idx] = updatedPreset;
	writePresets(list);
	return updatedPreset;
}

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
	for (const key of keysA) {
		if (!keysB.has(key)) removed.push(key);
		else if (
			JSON.stringify(a.options[key as keyof GenerationOptions]) !==
			JSON.stringify(b.options[key as keyof GenerationOptions])
		) {
			changed.push(key);
		}
	}
	for (const key of keysB) {
		if (!keysA.has(key)) added.push(key);
	}
	return { changed, added, removed };
}

export function exportPresetWithHistory(
	presetId: string,
): VersionedPreset | null {
	const preset = getPresetById(presetId);
	if (!preset) return null;
	return {
		...(preset.id !== undefined && { id: preset.id }),
		name: preset.name,
		taskType: preset.taskType,
		...(preset.options !== undefined && { options: preset.options }),
		...(preset.versions && { versions: preset.versions }),
		...(preset.currentVersion !== undefined && {
			currentVersion: preset.currentVersion,
		}),
		...(preset.createdAt !== undefined && { createdAt: preset.createdAt }),
		...(preset.updatedAt !== undefined && { updatedAt: preset.updatedAt }),
	};
}

export function importPresetWithHistory(
	presetData: VersionedPreset,
	options?: { overwrite?: boolean },
): Preset {
	const list = getPresets();
	const now = Date.now();
	if (presetData.id && options?.overwrite !== false) {
		const existingIdx = list.findIndex((p) => p.id === presetData.id);
		if (existingIdx !== -1) {
			const updated: Preset = { ...presetData, updatedAt: now };
			list[existingIdx] = updated;
			writePresets(list);
			return updated;
		}
	}
	const newId = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const newPreset: Preset = {
		...presetData,
		id: newId,
		createdAt: now,
		updatedAt: now,
	};
	list.push(newPreset);
	writePresets(list);
	return newPreset;
}
