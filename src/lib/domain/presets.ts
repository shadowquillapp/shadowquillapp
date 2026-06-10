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
	"outputXMLSchema",
	"identity",
	"additionalContext",
	"styleGuidelines",
] as const satisfies readonly (keyof GenerationOptions)[];

const ALLOWED_OPTION_KEYS = [
	"tone",
	"detail",
	"format",
	...STRING_OPTION_KEYS,
] as const satisfies readonly (keyof GenerationOptions)[];

const ALLOWED_PRESET_KEYS = [
	"id",
	"name",
	"taskType",
	"options",
	"createdAt",
	"updatedAt",
] as const;

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
const FORMAT_LEVELS: readonly Format[] = ["plain", "markdown", "xml"];

function sanitizePresetOptions(options: GenerationOptions): GenerationOptions {
	const raw = options as Record<string, unknown>;
	const sanitized: GenerationOptions = {};

	for (const key of ALLOWED_OPTION_KEYS) {
		const value = raw[key];
		if (value === undefined) continue;

		if (key === "tone" && isOneOf(value, TONE_LEVELS)) {
			sanitized.tone = value;
		} else if (key === "detail" && isOneOf(value, DETAIL_LEVELS)) {
			sanitized.detail = value;
		} else if (key === "format" && isOneOf(value, FORMAT_LEVELS)) {
			sanitized.format = value;
		} else if (isString(value) && isOneOf(key, STRING_OPTION_KEYS)) {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

function sanitizePreset(preset: Preset): Preset {
	const raw = preset as unknown as Record<string, unknown>;
	const sanitized: Preset = {
		name: preset.name,
		taskType: preset.taskType,
	};

	for (const key of ALLOWED_PRESET_KEYS) {
		if (key === "name" || key === "taskType") continue;
		const value = raw[key];
		if (value === undefined) continue;

		if (key === "options" && isRecord(value)) {
			sanitized.options = sanitizePresetOptions(value as GenerationOptions);
		} else if (key === "id" && isString(value)) {
			sanitized.id = value;
		} else if (
			(key === "createdAt" || key === "updatedAt") &&
			typeof value === "number"
		) {
			sanitized[key] = value;
		}
	}

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

function seedPreset(
	id: string,
	name: string,
	taskType: TaskType,
	tone: Tone,
	format: Format,
	additionalContext: string,
): Preset {
	return {
		id,
		name,
		taskType,
		options: {
			tone,
			detail: "normal",
			format,
			language: "English",
			additionalContext,
		},
	};
}

export function getDefaultPresets(): Preset[] {
	return [
		seedPreset(
			"daily-assistant",
			"Daily Helper",
			"intent",
			"friendly",
			"markdown",
			"Compile general everyday intent into brief, actionable execution framing. Preserve the user's goal and voice. Favor scannable structure without over-structuring.",
		),
		seedPreset(
			"quick-summarizer",
			"Quick Summary",
			"intent",
			"neutral",
			"markdown",
			"Compress source intent into concise summary framing. Extract key points and main ideas. Prioritize scannability and minimal unnecessary detail.",
		),
		seedPreset(
			"code-helper",
			"Code Helper",
			"engineering",
			"technical",
			"markdown",
			"Prioritize goal preservation and architectural consistency. Validate interaction contracts (inputs, outputs, side effects). Enforce design-system alignment with stated conventions. Surface gaps as actionable prompt clauses — do not invent technologies.",
		),
		seedPreset(
			"bug-hunter",
			"Bug Hunter",
			"engineering",
			"technical",
			"markdown",
			"Compile diagnostic intent with root-cause focus. Require reproduction steps, failure boundaries, and regression prevention in the output framing. Do not assume stack or environment not stated by the user.",
		),
		seedPreset(
			"email-drafter",
			"Email Draft",
			"narrative",
			"friendly",
			"plain",
			"Preserve the user's voice and second-person address. Compile email intent with subject line, greeting, and concise body framing. Do not rewrite personality or tone unless requested.",
		),
		seedPreset(
			"research-assistant",
			"Research Assistant",
			"analysis",
			"neutral",
			"markdown",
			"Define evidence boundaries and scope limits clearly. Require citation framing and balanced perspective. Extract implicit constraints and risk concerns from the user's request.",
		),
		seedPreset(
			"deep-analyst",
			"Deep Analyst",
			"analysis",
			"formal",
			"markdown",
			"Extract tradeoffs, counterarguments, and risk assessment requirements. Compile rigorous analysis framing with executive summary, evidence scope, and recommendation boundaries. Do not over-structure unless detail level requires it.",
		),
		seedPreset(
			"social-post",
			"Social Post",
			"persuasion",
			"friendly",
			"markdown",
			"Preserve audience intent and message core. Compile hook, content, and CTA framing without drift. Align channel conventions to user-stated context.",
		),
		seedPreset(
			"image-creator",
			"Image Creator",
			"visual",
			"neutral",
			"markdown",
			"Compress visual intent into model-parseable descriptors. Lock subject, mood, and composition. Surface spec gaps as concrete visual clauses — do not invent values not stated by the user.",
		),
		seedPreset(
			"video-creator",
			"Video Creator",
			"motion",
			"neutral",
			"markdown",
			"Compile temporal visual intent with scene, action, and camera semantics. Validate interaction flow across frames. Surface temporal spec gaps as concrete clauses — do not invent values not stated by the user.",
		),
	];
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
