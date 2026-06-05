import type { GenerationOptions, TaskType } from "@/types";
import { ValidationError } from "./errors";
import { buildDirectives } from "./prompt-directives";

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
		"Domain: Engineering — Goal: lock objective; do not invent stack or technologies. Accessibility: requirements readable by any developer. Interaction: API/UX flows, I/O contracts, side effects. Design-system: project conventions and patterns. Remediation: surface gaps as concrete technical clauses.",
	narrative:
		"Domain: Narrative — Goal: preserve voice, POV, and tone. Accessibility: reading level and scannability. Interaction: reader journey and structure. Design-system: style guide and format rules. Remediation: add missing narrative constraints inline.",
	analysis:
		"Domain: Analysis — Goal: lock research question and scope boundaries. Accessibility: clear evidence and methodology framing. Interaction: source requirements and deliverable flow. Design-system: citation and rigor conventions. Remediation: define gaps as scope or evidence clauses.",
	persuasion:
		"Domain: Persuasion — Goal: preserve audience and core message. Accessibility: high-impact, direct framing. Interaction: channel flow and CTA touchpoints. Design-system: channel specs and compliance notes. Remediation: add missing audience or value-prop clauses.",
	visual:
		"Domain: Visual — Goal: lock subject, mood, and composition intent. Accessibility: model-parseable descriptors. Interaction: focal hierarchy and spatial relationships. Design-system: style preset, aspect ratio, resolution. Remediation: correct spec gaps inline; do not invent values.",
	motion:
		"Domain: Motion — Goal: lock scene, action, and temporal intent. Accessibility: clear camera and movement semantics. Interaction: visual flow across frames. Design-system: duration, fps, shot type, movement specs. Remediation: correct temporal spec gaps inline; do not invent values.",
};

const CORE_GUIDELINES =
	"Apply the compiler role above to the user input below. Output only the compiled prompt — never answer the underlying task.";

/**
 * Validation result type for type-safe error handling
 */
export interface ValidationResult {
	valid: boolean;
	error?: ValidationError;
	message?: string;
}

/**
 * Validate builder input with structured error information
 * @returns null if valid, error message string if invalid
 */
export function validateBuilderInput(
	rawUserInput: string,
	_taskType: TaskType,
): string | null {
	const result = validateBuilderInputTyped(rawUserInput, _taskType);
	return result.valid ? null : (result.message ?? "Validation failed");
}

/**
 * Validate builder input with typed error objects
 * Use this for more detailed error handling
 */
export function validateBuilderInputTyped(
	rawUserInput: string,
	taskType: TaskType,
): ValidationResult {
	if (rawUserInput.length === 0) {
		return {
			valid: false,
			error: new ValidationError(
				"Empty input. Please provide content to work with.",
				{
					field: "input",
					value: rawUserInput,
				},
			),
			message: "Empty input. Please provide content to work with.",
		};
	}

	const injectionPatterns = [
		/ignore\s+all\s+previous\s+instructions/i,
		/forget\s+everything\s+above/i,
		/disregard\s+all\s+previous/i,
		/\bjailbreak\b/i,
		/\bDAN\s*mode\b/i,
	];

	if (injectionPatterns.some((pattern) => pattern.test(rawUserInput))) {
		return {
			valid: false,
			error: new ValidationError(
				"Input rejected: Please focus on describing the prompt content you want created.",
				{
					field: "input",
					value: rawUserInput,
					details: { taskType, reason: "injection_detected" },
				},
			),
			message:
				"Input rejected: Please focus on describing the prompt content you want created.",
		};
	}

	if (rawUserInput.split(/\s+/).filter(Boolean).length < 2) {
		return {
			valid: false,
			error: new ValidationError(
				"Input too brief. Please provide more detail about what you want.",
				{
					field: "input",
					value: rawUserInput,
					details: {
						wordCount: rawUserInput.split(/\s+/).filter(Boolean).length,
					},
				},
			),
			message:
				"Input too brief. Please provide more detail about what you want.",
		};
	}

	return { valid: true };
}

function buildConstraints(
	taskType: TaskType,
	options?: GenerationOptions,
): string[] {
	if (!options) return [];
	const constraints: string[] = [];

	if (options.tone) constraints.push(`tone=${options.tone}`);
	if (options.format) constraints.push(`format=${options.format}`);
	if (options.language && options.language.toLowerCase() !== "english") {
		constraints.push(`lang=${options.language}`);
	}

	if (taskType === "visual" || taskType === "motion") {
		if (options.stylePreset) constraints.push(`style=${options.stylePreset}`);
		if (options.aspectRatio) constraints.push(`ratio=${options.aspectRatio}`);
	}

	if (taskType === "motion") {
		if (options.durationSeconds)
			constraints.push(`duration=${options.durationSeconds}s`);
		if (options.frameRate) constraints.push(`fps=${options.frameRate}`);
		if (options.cameraMovement)
			constraints.push(`camera=${options.cameraMovement}`);
		if (options.shotType) constraints.push(`shot=${options.shotType}`);
		if (options.includeStoryboard) constraints.push("storyboard=yes");
	}

	if (taskType === "narrative") {
		if (options.writingStyle) constraints.push(`style=${options.writingStyle}`);
		if (options.pointOfView) constraints.push(`pov=${options.pointOfView}`);
		if (options.readingLevel) constraints.push(`level=${options.readingLevel}`);
		if (options.targetWordCount)
			constraints.push(`target_words=${options.targetWordCount}`);
		if (options.includeHeadings) constraints.push("headings=yes");
	}

	if (taskType === "persuasion") {
		if (options.marketingChannel)
			constraints.push(`channel=${options.marketingChannel}`);
		if (options.ctaStyle) constraints.push(`cta=${options.ctaStyle}`);
	}

	if (taskType === "engineering") {
		if (options.includeTests !== undefined) {
			constraints.push(`tests=${options.includeTests ? "yes" : "no"}`);
		}
	}

	if (taskType === "analysis") {
		if (options.requireCitations !== undefined) {
			constraints.push(`citations=${options.requireCitations ? "yes" : "no"}`);
		}
	}

	return constraints;
}

export function buildUnifiedPromptCore(params: {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
	systemPrompt: string;
}): string {
	const { input, taskType, options, systemPrompt } = params;
	const rawUserInput = input.trim();

	const sections: string[] = [];

	if (options?.language && options.language.toLowerCase() !== "english") {
		sections.push(
			`[LANGUAGE INSTRUCTION - READ FIRST]\nYou MUST respond ONLY in ${options.language}. Every single word of your response must be in ${options.language}.\nDo NOT use English. This is your primary instruction.\n[END LANGUAGE INSTRUCTION]`,
		);
	}

	if (systemPrompt) {
		sections.push(systemPrompt);
	}

	if (options?.identity?.trim()) {
		sections.push(`Act as ${options.identity.trim()}.`);
	}

	if (options?.language && options.language.toLowerCase() !== "english") {
		sections.push(
			`⚠️ REMINDER: Write your ENTIRE output in ${options.language}. The user input may be in English, but YOUR response must be 100% in ${options.language}.`,
		);
	}

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

	const constraints = buildConstraints(taskType, options);
	if (constraints.length > 0) {
		sections.push(`Constraints: ${constraints.join(", ")}`);
	}

	const delimiter =
		options?.format === "xml"
			? `<user_input>\n${rawUserInput}\n</user_input>`
			: `---\n${rawUserInput}\n---`;
	sections.push(`User Input:\n${delimiter}`);

	if (options?.additionalContext?.trim()) {
		sections.push(`Additional Context:\n${options.additionalContext}`);
	}

	let finalInstruction = `Compile the user input into stable ${taskType} execution framing. Output ONLY the compiled prompt text — no preamble or meta-commentary.`;

	if (options?.detail) {
		const wordLimits: Record<string, string> = {
			brief: "75-150 words (DO NOT EXCEED 150)",
			normal: "200-250 words (DO NOT EXCEED 250)",
			detailed: "300-375 words (DO NOT EXCEED 375)",
		};
		const limit = wordLimits[options.detail];
		if (limit) {
			finalInstruction += ` Your compiled output must be ${limit}. Do NOT include word count constraints in the compiled prompt itself.`;
		}
	}

	if (options?.language && options.language.toLowerCase() !== "english") {
		finalInstruction += ` Your entire output MUST be written in ${options.language}.`;
	}

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

/**
 * Build a prompt for refining an existing enhanced prompt based on user feedback
 */
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

	const sections: string[] = [];

	if (options?.language && options.language.toLowerCase() !== "english") {
		sections.push(
			`[LANGUAGE INSTRUCTION - READ FIRST]\nYou MUST respond ONLY in ${options.language}. Every single word of your response must be in ${options.language}.\nDo NOT use English. This is your primary instruction.\n[END LANGUAGE INSTRUCTION]`,
		);
	}

	sections.push(systemPrompt?.trim() || REFINEMENT_GUIDELINES);

	if (options?.language && options.language.toLowerCase() !== "english") {
		sections.push(
			`⚠️ REMINDER: Write your ENTIRE output in ${options.language}. The existing prompt may be in English, but YOUR refined output must be 100% in ${options.language}.`,
		);
	}

	sections.push(`Task Type: ${taskType}`);
	sections.push(VALIDATION_PIPELINE);

	const domainMap = DOMAIN_VALIDATION_MAPS[taskType];
	if (domainMap) {
		sections.push(domainMap);
	}

	const promptDelimiter =
		options?.format === "xml"
			? `<existing_prompt>\n${trimmedPrevious}\n</existing_prompt>`
			: `---\n${trimmedPrevious}\n---`;
	sections.push(`Existing Compiled Prompt:\n${promptDelimiter}`);

	const requestDelimiter =
		options?.format === "xml"
			? `<refinement_request>\n${trimmedRequest}\n</refinement_request>`
			: `---\n${trimmedRequest}\n---`;
	sections.push(`Refinement Request:\n${requestDelimiter}`);

	let finalInstruction =
		"Apply the refinement request to the existing compiled prompt. Output ONLY the refined prompt text — no preamble or meta-commentary.";

	if (options?.detail) {
		const wordLimits: Record<string, string> = {
			brief: "75-150 words (DO NOT EXCEED 150)",
			normal: "200-250 words (DO NOT EXCEED 250)",
			detailed: "300-375 words (DO NOT EXCEED 375)",
		};
		const limit = wordLimits[options.detail];
		if (limit) {
			finalInstruction += ` Your refined output must be ${limit}.`;
		}
	}

	if (options?.language && options.language.toLowerCase() !== "english") {
		finalInstruction += ` Your entire output MUST be written in ${options.language}.`;
	}

	sections.push(finalInstruction);

	return sections.join("\n\n");
}

export { buildDirectives as buildOptionDirectives } from "./prompt-directives";
