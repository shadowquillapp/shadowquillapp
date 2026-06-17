import type {
	Detail,
	Format,
	GenerationOptions,
	PresetLite,
	TaskType,
	Tone,
} from "@/types";
import { getRaw, setJSON } from "../local-storage";
import { isOneOf, isRecord, isString, safeParse } from "../schema";
import { STORAGE_KEYS } from "../storage-keys";

export interface Preset extends PresetLite {
	createdAt?: number;
	updatedAt?: number;
}

const STRING_OPTION_KEYS = [
	"language",
	"audience",
	"additionalContext",
	"styleGuidelines",
] as const satisfies readonly (keyof GenerationOptions)[];

const TASK_TYPES: readonly TaskType[] = [
	"intent",
	"engineering",
	"visual",
	"analysis",
	"narrative",
	"persuasion",
	"motion",
];

const DETAIL_LEVELS: readonly Detail[] = ["normal", "detailed"];
const TONE_LEVELS: readonly Tone[] = [
	"neutral",
	"friendly",
	"formal",
	"technical",
	"persuasive",
];
const FORMAT_LEVELS: readonly Format[] = ["plain", "markdown"];

function sanitizePresetOptions(options: GenerationOptions): GenerationOptions {
	const raw = options as Record<string, unknown>;
	const sanitized: GenerationOptions = {};

	if (isOneOf(raw.tone, TONE_LEVELS)) sanitized.tone = raw.tone;
	if (isOneOf(raw.detail, DETAIL_LEVELS)) sanitized.detail = raw.detail;
	if (isOneOf(raw.format, FORMAT_LEVELS)) sanitized.format = raw.format;
	for (const key of STRING_OPTION_KEYS) {
		const value = raw[key];
		if (isString(value)) sanitized[key] = value;
	}

	return sanitized;
}

function sanitizePreset(preset: Preset): Preset {
	const raw = preset as unknown as Record<string, unknown>;
	const sanitized: Preset = {
		name: preset.name,
		taskType: preset.taskType,
	};

	if (isString(raw.id)) sanitized.id = raw.id;
	if (isRecord(raw.options)) {
		sanitized.options = sanitizePresetOptions(raw.options as GenerationOptions);
	}
	if (typeof raw.createdAt === "number") sanitized.createdAt = raw.createdAt;
	if (typeof raw.updatedAt === "number") sanitized.updatedAt = raw.updatedAt;

	return sanitized;
}

function isPreset(v: unknown): v is Preset {
	if (!isRecord(v) || !isString(v.name)) return false;
	if (!isString(v.taskType) || !isOneOf(v.taskType, TASK_TYPES)) return false;
	return v.options === undefined || isRecord(v.options);
}

export function getPresets(): Preset[] {
	const list = safeParse(getRaw(STORAGE_KEYS.PRESETS.key), Array.isArray, []);
	return list.filter(isPreset).map(sanitizePreset);
}

function writePresets(list: Preset[]): void {
	setJSON(STORAGE_KEYS.PRESETS.key, list);
}

export function getPresetById(id: string): Preset | undefined {
	return getPresets().find((p) => p.id === id);
}

interface PresetSeed {
	id: string;
	name: string;
	taskType: TaskType;
	tone: Tone;
	additionalContext: string;
	audience: string;
	styleGuidelines: string;
	format?: Format;
}

const DEFAULT_PRESET_SEEDS: readonly PresetSeed[] = [
	{
		id: "daily-assistant",
		name: "Daily Helper",
		taskType: "intent",
		tone: "friendly",
		additionalContext:
			"Compile general everyday intent into brief, actionable execution framing. Preserve the user's goal and voice. Favor scannable structure without over-structuring.",
		audience: "A general everyday user who wants quick, practical help.",
		styleGuidelines:
			"Keep it warm, clear, and concise. Avoid jargon. Use short sentences and plain language.",
	},
	{
		id: "quick-summarizer",
		name: "Quick Summary",
		taskType: "intent",
		tone: "neutral",
		additionalContext:
			"Compress source intent into concise summary framing. Extract key points and main ideas. Prioritize scannability and minimal unnecessary detail.",
		audience: "A busy reader who needs the gist fast.",
		styleGuidelines:
			"Lead with the main point. Prefer bullet points over paragraphs. Cut filler and repetition.",
	},
	{
		id: "code-helper",
		name: "Code Helper",
		taskType: "engineering",
		tone: "technical",
		additionalContext:
			"Prioritize goal preservation and architectural consistency. Validate interaction contracts (inputs, outputs, side effects). Enforce design-system alignment with stated conventions. Surface gaps as actionable prompt clauses — do not invent technologies.",
		audience: "A software developer comfortable with technical detail.",
		styleGuidelines:
			"Be precise and unambiguous. Reference inputs, outputs, and edge cases. Prefer code blocks and exact terminology over prose.",
	},
	{
		id: "research-assistant",
		name: "Research Assistant",
		taskType: "analysis",
		tone: "neutral",
		additionalContext:
			"Define evidence boundaries and scope limits clearly. Require citation framing and balanced perspective. Extract implicit constraints and risk concerns from the user's request.",
		audience: "A curious reader who wants balanced, well-sourced information.",
		styleGuidelines:
			"Stay neutral and evidence-based. Note assumptions and uncertainty. Ask for sources where claims need support.",
	},
	{
		id: "deep-analyst",
		name: "Deep Analyst",
		taskType: "analysis",
		tone: "formal",
		additionalContext:
			"Extract tradeoffs, counterarguments, and risk assessment requirements. Compile rigorous analysis framing with executive summary, evidence scope, and recommendation boundaries. Do not over-structure unless detail level requires it.",
		audience:
			"A decision-maker who needs rigorous analysis and clear recommendations.",
		styleGuidelines:
			"Open with an executive summary. Weigh tradeoffs and counterarguments explicitly. Be formal, structured, and decisive.",
	},
	{
		id: "social-post",
		name: "Social Post",
		taskType: "persuasion",
		tone: "friendly",
		additionalContext:
			"Preserve audience intent and message core. Compile hook, content, and CTA framing without drift. Align channel conventions to user-stated context.",
		audience: "Social media followers scrolling a busy feed.",
		styleGuidelines:
			"Start with a strong hook. Keep it punchy and conversational. End with a clear call to action. Use line breaks for readability.",
	},
	{
		id: "image-creator",
		name: "Image Creator",
		taskType: "visual",
		tone: "neutral",
		additionalContext:
			"Compress visual intent into model-parseable descriptors. Lock subject, mood, and composition. Surface spec gaps as concrete visual clauses — do not invent values not stated by the user.",
		audience:
			"An AI image generator (e.g. Midjourney, DALL·E, Stable Diffusion).",
		styleGuidelines:
			"Be vivid and specific about subject, style, lighting, mood, and composition. Use descriptive comma-separated phrases. Avoid vague adjectives.",
	},
	{
		id: "video-creator",
		name: "Video Creator",
		taskType: "motion",
		tone: "neutral",
		additionalContext:
			"Compile temporal visual intent with scene, action, and camera semantics. Validate interaction flow across frames. Surface temporal spec gaps as concrete clauses — do not invent values not stated by the user.",
		audience: "An AI video generator (e.g. Sora, Runway, Veo).",
		styleGuidelines:
			"Describe motion, camera movement, pacing, and scene transitions. Be concrete about what changes over time. Keep shots clear and sequential.",
	},
	{
		id: "school-work",
		name: "School Work",
		taskType: "analysis",
		tone: "friendly",
		additionalContext:
			"Help students turn assignments, notes, and study goals into clear academic work framing. Preserve the prompt's requirements, rubric constraints, and target grade level. Favor step-by-step explanations, study guidance, and citation awareness without completing work dishonestly.",
		audience: "A student trying to learn and understand the material.",
		styleGuidelines:
			"Explain step by step in approachable language. Encourage understanding over shortcuts. Note where citations or original work are expected.",
	},
	{
		id: "story-writer",
		name: "Story Writer",
		taskType: "narrative",
		tone: "friendly",
		additionalContext:
			"Compile creative writing intent with character, setting, conflict, and pacing semantics. Preserve the writer's voice, genre, and point of view. Surface narrative gaps as concrete prompt clauses — do not invent plot details the user did not state.",
		audience: "Readers of the intended genre and age group.",
		styleGuidelines:
			"Show, don't tell. Preserve the writer's voice and point of view. Keep pacing and tone consistent with the genre.",
	},
];

function seedPreset(seed: PresetSeed): Preset {
	return {
		id: seed.id,
		name: seed.name,
		taskType: seed.taskType,
		options: {
			tone: seed.tone,
			detail: "normal",
			format: seed.format ?? "markdown",
			language: "English",
			audience: seed.audience,
			styleGuidelines: seed.styleGuidelines,
			additionalContext: seed.additionalContext,
		},
	};
}

export function getDefaultPresets(): Preset[] {
	return DEFAULT_PRESET_SEEDS.map(seedPreset);
}

export function ensureDefaultPreset(): void {
	const list = getPresets();
	if (list.length > 0) return;
	const now = Date.now();
	writePresets(
		getDefaultPresets().map((preset) => ({
			...preset,
			createdAt: now,
			updatedAt: now,
		})),
	);
}

function generatePresetId(): string {
	return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function savePreset(preset: Preset): Preset {
	const normalizedPreset = sanitizePreset(preset);
	const list = getPresets();
	const now = Date.now();

	const persist = (p: Preset, idx?: number): Preset => {
		if (idx === undefined) list.push(p);
		else list[idx] = p;
		writePresets(list);
		return p;
	};

	const updateAt = (idx: number): Preset | null => {
		const existing = list[idx];
		if (!existing) return null;
		return persist(
			{
				...existing,
				...normalizedPreset,
				...(normalizedPreset.id
					? {}
					: { id: existing.id ?? generatePresetId() }),
				createdAt: existing.createdAt ?? now,
				updatedAt: now,
			},
			idx,
		);
	};

	if (normalizedPreset.id) {
		const idx = list.findIndex((p) => p.id === normalizedPreset.id);
		const updated = idx !== -1 ? updateAt(idx) : null;
		if (updated) return updated;
		return persist({ ...normalizedPreset, createdAt: now, updatedAt: now });
	}

	const normalized = (normalizedPreset.name || "").trim().toLowerCase();
	const byNameIdx = list.findIndex(
		(p) => (p.name || "").trim().toLowerCase() === normalized,
	);
	if (byNameIdx !== -1) {
		const updated = updateAt(byNameIdx);
		if (updated) return updated;
	}

	return persist({
		...normalizedPreset,
		id: generatePresetId(),
		createdAt: now,
		updatedAt: now,
	});
}

export function deletePresetByIdOrName(id?: string, name?: string): void {
	const list = getPresets().filter((p) => {
		if (id) return p.id !== id;
		if (name) return p.name !== name;
		return true;
	});
	writePresets(list);
}
