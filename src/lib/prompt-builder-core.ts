import type { GenerationOptions, TaskType } from "@/types";
import {
	buildDirectives,
	DETAIL_WORD_LIMIT_LABELS,
	isNonEnglishLanguage,
} from "./prompt-directives/base";

export const VALIDATION_PIPELINE = `Validation pipeline (apply in order):
1. User Goal Preservation
2. Accessibility Validation
3. Interaction Validation
4. Design-System Validation
5. Actionable Remediation`;

const DOMAIN_VALIDATION_MAPS: Record<TaskType, string> = {
	intent:
		"Domain: Intent — Goal: lock objective without domain assumptions. Accessibility: scannable, unambiguous framing. Interaction: define expected inputs/outputs where relevant. Design-system: match stated format and tone. Remediation: add missing constraints as prompt clauses.",
	engineering:
		"Domain: Engineering — Goal: lock objective; do not invent stack or technologies. Accessibility: requirements readable by any developer. Interaction: API/UX flows, I/O contracts, side effects. Design-system: conventions stated in user input. Remediation: surface gaps as concrete technical clauses.",
	narrative:
		"Domain: Narrative — Goal: preserve voice and tone from user input. Accessibility: reading level and scannability. Interaction: reader journey and structure. Design-system: style conventions stated in user input. Remediation: add missing narrative constraints inline.",
	analysis:
		"Domain: Analysis — Goal: lock research question and scope boundaries. Accessibility: clear evidence and methodology framing. Interaction: source requirements and deliverable flow. Design-system: rigor conventions stated in user input. Remediation: define gaps as scope or evidence clauses.",
	persuasion:
		"Domain: Persuasion — Goal: preserve audience and core message. Accessibility: high-impact, direct framing. Interaction: channel flow and CTA touchpoints. Design-system: conventions stated in user input. Remediation: add missing audience or value-prop clauses.",
	visual:
		"Domain: Visual — Goal: lock subject, mood, and composition intent. Accessibility: model-parseable descriptors. Interaction: focal hierarchy and spatial relationships. Design-system: visual conventions stated in user input. Remediation: surface spec gaps as concrete visual clauses; do not invent values.",
	motion:
		"Domain: Motion — Goal: lock scene, action, and temporal intent. Accessibility: clear camera and movement semantics. Interaction: visual flow across frames. Design-system: temporal conventions stated in user input. Remediation: surface temporal spec gaps as concrete clauses; do not invent values.",
};

const CORE_GUIDELINES =
	"Apply the compiler role above to the user input below. Output only the compiled prompt — never answer the underlying task.";

function pushLanguagePreamble(
	sections: string[],
	language: string | undefined,
): void {
	if (!isNonEnglishLanguage(language)) return;
	sections.push(
		`[LANGUAGE INSTRUCTION - READ FIRST]\nYou MUST respond ONLY in ${language}. Every single word of your response must be in ${language}.\nDo NOT use English. This is your primary instruction.\n[END LANGUAGE INSTRUCTION]`,
	);
}

function pushLanguageReminder(
	sections: string[],
	language: string | undefined,
	mode: "unified" | "refinement",
): void {
	if (!isNonEnglishLanguage(language)) return;
	const subject =
		mode === "unified"
			? "The user input may be in English, but YOUR response must be 100%"
			: "The existing prompt may be in English, but YOUR refined output must be 100%";
	sections.push(
		`⚠️ REMINDER: Write your ENTIRE output in ${language}. ${subject} in ${language}.`,
	);
}

function languageFinalSuffix(language: string | undefined): string {
	return isNonEnglishLanguage(language)
		? ` Your entire output MUST be written in ${language}.`
		: "";
}

function delimit(
	format: GenerationOptions["format"] | undefined,
	tag: string,
	text: string,
): string {
	return format === "xml"
		? `<${tag}>\n${text}\n</${tag}>`
		: `---\n${text}\n---`;
}

const INJECTION_PATTERNS = [
	/ignore\s+all\s+previous\s+instructions/i,
	/forget\s+everything\s+above/i,
	/disregard\s+all\s+previous/i,
	/\bjailbreak\b/i,
	/\bDAN\s*mode\b/i,
];

export function validateBuilderInput(
	rawUserInput: string,
	_taskType: TaskType,
): string | null {
	if (rawUserInput.length === 0) {
		return "Empty input. Please provide content to work with.";
	}
	if (INJECTION_PATTERNS.some((pattern) => pattern.test(rawUserInput))) {
		return "Input rejected: Please focus on describing the prompt content you want created.";
	}
	if (rawUserInput.split(/\s+/).filter(Boolean).length < 2) {
		return "Input too brief. Please provide more detail about what you want.";
	}
	return null;
}

export function buildUnifiedPromptCore(params: {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
	systemPrompt: string;
}): string {
	const { input, taskType, options, systemPrompt } = params;
	const rawUserInput = input.trim();
	const language = options?.language;

	const sections: string[] = [];

	pushLanguagePreamble(sections, language);

	if (systemPrompt) {
		sections.push(systemPrompt);
	}

	if (options?.identity?.trim()) {
		sections.push(`Act as ${options.identity.trim()}.`);
	}

	pushLanguageReminder(sections, language, "unified");

	sections.push(CORE_GUIDELINES);
	sections.push(VALIDATION_PIPELINE);

	const domainMap = DOMAIN_VALIDATION_MAPS[taskType];
	if (domainMap) {
		sections.push(domainMap);
	}

	const directives = buildDirectives(taskType, options);
	if (directives.length > 0) {
		sections.push(`Directives:\n${directives.map((d) => `- ${d}`).join("\n")}`);
	}

	const constraints: string[] = [];
	if (options?.tone) constraints.push(`tone=${options.tone}`);
	if (options?.format) constraints.push(`format=${options.format}`);
	if (isNonEnglishLanguage(language)) {
		constraints.push(`lang=${language}`);
	}
	if (constraints.length > 0) {
		sections.push(`Constraints: ${constraints.join(", ")}`);
	}

	sections.push(
		`User Input:\n${delimit(options?.format, "user_input", rawUserInput)}`,
	);

	if (options?.additionalContext?.trim()) {
		sections.push(`Additional Context:\n${options.additionalContext}`);
	}

	let finalInstruction = `Compile the user input into stable ${taskType} execution framing. Output ONLY the compiled prompt text — no preamble or meta-commentary.`;

	if (options?.detail) {
		const limit = DETAIL_WORD_LIMIT_LABELS[options.detail];
		if (limit) {
			finalInstruction += ` Your compiled output must be ${limit}. Do NOT include word count constraints in the compiled prompt itself.`;
		}
	}

	finalInstruction += languageFinalSuffix(language);

	sections.push(finalInstruction);

	return sections.join("\n\n");
}

const REFINEMENT_GUIDELINES = `You are an intent-framing refiner for ShadowQuill.

Your task: Modify an existing compiled prompt based on user feedback.
Never answer the underlying task — only refine the compiled framing.

Rules:
- You receive an EXISTING COMPILED PROMPT and a REFINEMENT REQUEST
- Apply the 5-stage validation pipeline to the refinement
- Preserve stable objective retention and the user's voice
- Only change what the user specifically requests
- Additive requests: extend without removing existing content
- Corrections: substitute only the targeted element
- Removals: delete only the specified element
- Output ONLY the refined compiled prompt text`;

export function buildRefinementPromptCore(params: {
	previousOutput: string;
	refinementRequest: string;
	taskType: TaskType;
	options?: GenerationOptions;
	systemPrompt?: string;
}): string {
	const { previousOutput, refinementRequest, taskType, options, systemPrompt } =
		params;
	const trimmedRequest = refinementRequest.trim();
	const trimmedPrevious = previousOutput.trim();
	const language = options?.language;

	const sections: string[] = [];

	pushLanguagePreamble(sections, language);

	sections.push(systemPrompt?.trim() || REFINEMENT_GUIDELINES);

	pushLanguageReminder(sections, language, "refinement");

	sections.push(`Task Type: ${taskType}`);
	sections.push(VALIDATION_PIPELINE);

	const domainMap = DOMAIN_VALIDATION_MAPS[taskType];
	if (domainMap) {
		sections.push(domainMap);
	}

	sections.push(
		`Existing Compiled Prompt:\n${delimit(options?.format, "existing_prompt", trimmedPrevious)}`,
	);
	sections.push(
		`Refinement Request:\n${delimit(options?.format, "refinement_request", trimmedRequest)}`,
	);

	let finalInstruction =
		"Apply the refinement request to the existing compiled prompt. Output ONLY the refined prompt text — no preamble or meta-commentary.";

	if (options?.detail) {
		const limit = DETAIL_WORD_LIMIT_LABELS[options.detail];
		if (limit) {
			finalInstruction += ` Your refined output must be ${limit}.`;
		}
	}

	finalInstruction += languageFinalSuffix(language);

	sections.push(finalInstruction);

	return sections.join("\n\n");
}
