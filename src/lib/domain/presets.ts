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

const ALLOWED_OPTION_KEYS = [
	"tone",
	"detail",
	"format",
	"language",
	"audience",
	"outputXMLSchema",
	"identity",
	"additionalContext",
	"styleGuidelines",
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
		} else if (isString(value)) {
			if (key === "language") sanitized.language = value;
			else if (key === "audience") sanitized.audience = value;
			else if (key === "outputXMLSchema") sanitized.outputXMLSchema = value;
			else if (key === "identity") sanitized.identity = value;
			else if (key === "additionalContext") sanitized.additionalContext = value;
			else if (key === "styleGuidelines") sanitized.styleGuidelines = value;
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

export function getDefaultPresets(): Preset[] {
	return [
		{
			id: "daily-assistant",
			name: "Daily Helper",
			taskType: "intent",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Compile general everyday intent into brief, actionable execution framing. Preserve the user's goal and voice. Favor scannable structure without over-structuring.",
			},
		},
		{
			id: "quick-summarizer",
			name: "Quick Summary",
			taskType: "intent",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Compress source intent into concise summary framing. Extract key points and main ideas. Prioritize scannability and minimal unnecessary detail.",
			},
		},
		{
			id: "code-helper",
			name: "Code Helper",
			taskType: "engineering",
			options: {
				tone: "technical",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Prioritize goal preservation and architectural consistency. Validate interaction contracts (inputs, outputs, side effects). Enforce design-system alignment with stated conventions. Surface gaps as actionable prompt clauses — do not invent technologies.",
			},
		},
		{
			id: "bug-hunter",
			name: "Bug Hunter",
			taskType: "engineering",
			options: {
				tone: "technical",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Compile diagnostic intent with root-cause focus. Require reproduction steps, failure boundaries, and regression prevention in the output framing. Do not assume stack or environment not stated by the user.",
			},
		},
		{
			id: "email-drafter",
			name: "Email Draft",
			taskType: "narrative",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "plain",
				language: "English",
				additionalContext:
					"Preserve the user's voice and second-person address. Compile email intent with subject line, greeting, and concise body framing. Do not rewrite personality or tone unless requested.",
			},
		},
		{
			id: "research-assistant",
			name: "Research Assistant",
			taskType: "analysis",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Define evidence boundaries and scope limits clearly. Require citation framing and balanced perspective. Extract implicit constraints and risk concerns from the user's request.",
			},
		},
		{
			id: "deep-analyst",
			name: "Deep Analyst",
			taskType: "analysis",
			options: {
				tone: "formal",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Extract tradeoffs, counterarguments, and risk assessment requirements. Compile rigorous analysis framing with executive summary, evidence scope, and recommendation boundaries. Do not over-structure unless detail level requires it.",
			},
		},
		{
			id: "social-post",
			name: "Social Post",
			taskType: "persuasion",
			options: {
				tone: "friendly",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Preserve audience intent and message core. Compile hook, content, and CTA framing without drift. Align channel conventions to user-stated context.",
			},
		},
		{
			id: "image-creator",
			name: "Image Creator",
			taskType: "visual",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Compress visual intent into model-parseable descriptors. Lock subject, mood, and composition. Surface spec gaps as concrete visual clauses — do not invent values not stated by the user.",
			},
		},
		{
			id: "video-creator",
			name: "Video Creator",
			taskType: "motion",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				additionalContext:
					"Compile temporal visual intent with scene, action, and camera semantics. Validate interaction flow across frames. Surface temporal spec gaps as concrete clauses — do not invent values not stated by the user.",
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
			createdAt: now,
			updatedAt: now,
		})),
	);
}

export function savePreset(preset: Preset): Preset {
	const normalizedPreset = sanitizePreset(preset);
	const list = getPresets();
	const now = Date.now();

	if (normalizedPreset.id) {
		const idx = list.findIndex((p) => p.id === normalizedPreset.id);
		if (idx !== -1) {
			const existing = list[idx];
			if (existing) {
				const updated: Preset = {
					...existing,
					...normalizedPreset,
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
			const updated: Preset = {
				...existing,
				...normalizedPreset,
				id,
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
