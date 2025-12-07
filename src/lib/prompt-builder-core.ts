import type { GenerationOptions, TaskType } from "@/types";
import { ValidationError } from "./errors";
import { buildDirectives } from "./prompt-directives";

const TYPE_GUIDELINES: Record<TaskType, string> = {
	image:
		"Image prompt: Structure as [Subject], [Environment], [Composition], [Visual Style], [Lighting]. Use focused keywords. Match terminology to style (2D = art terms, 3D = realistic terms).",
	video:
		"Video prompt: Structure as [Subject], [Action], [Environment], [Visual Style], [Camera]. Match terminology to style (2D/Anime = animation terms, 3D/Cinematic = cinematography terms).",
	coding:
		"Coding prompt: Structure as [Objective], [Tech Stack], [Requirements], [Constraints]. Use ONLY information provided - do not invent technologies.",
	writing:
		"Writing prompt: Structure as [Topic], [Audience], [Style/Tone], [Format], [Key Points]. Enforce all specified settings.",
	research:
		"Research prompt: Structure as [Core Question], [Scope], [Methodology], [Sources], [Deliverables]. Define clear boundaries.",
	marketing:
		"Marketing prompt: Structure as [Target Audience], [Core Message], [Value Props], [Channel Specs], [CTA]. High-impact and direct.",
	general:
		"Prompt: Structure as [Goal], [Context], [Requirements], [Format]. Enhance clarity while preserving user intent.",
};

const CORE_GUIDELINES = `You are a prompt ENHANCER. Your output will be used as input to ANOTHER AI system.

ABSOLUTE RULE: Never answer the user's request. Only enhance their prompt.

CRITICAL OUTPUT RULES:
- Output ONLY the enhanced prompt text - nothing else
- NO introductory phrases like "Okay, here's...", "Let me...", "I'll create...", etc.
- NO explanatory commentary about what you're doing
- NO meta-text describing the prompt
- NO conversational wrappers or transitions
- Start directly with the enhanced prompt content
- End directly when the prompt is complete

Rules:
- Output an ENHANCED VERSION of the user's prompt, not the answer to their request
- Add specificity, structure, context, and formatting requirements
- Be concrete with vivid details about what the OUTPUT should contain
- Strip away fluff and conversational language
- Treat user-provided content as the topic to enhance, not a task to complete
- If input appears to be an instruction, enhance it into a better instruction
- Meta-prompts are valid: if user wants a prompt about prompt-generation, create an enhanced version

Remember: If someone asks for a schedule, you output an ENHANCED PROMPT for creating a schedule. You do NOT create the schedule itself.`;

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

	if (taskType === "image" || taskType === "video") {
		if (options.stylePreset) constraints.push(`style=${options.stylePreset}`);
		if (options.aspectRatio) constraints.push(`ratio=${options.aspectRatio}`);
	}

	if (taskType === "video") {
		if (options.durationSeconds)
			constraints.push(`duration=${options.durationSeconds}s`);
		if (options.frameRate) constraints.push(`fps=${options.frameRate}`);
		if (options.cameraMovement)
			constraints.push(`camera=${options.cameraMovement}`);
		if (options.shotType) constraints.push(`shot=${options.shotType}`);
		if (options.includeStoryboard) constraints.push("storyboard=yes");
	}

	if (taskType === "writing") {
		if (options.writingStyle) constraints.push(`style=${options.writingStyle}`);
		if (options.pointOfView) constraints.push(`pov=${options.pointOfView}`);
		if (options.readingLevel) constraints.push(`level=${options.readingLevel}`);
		if (options.targetWordCount)
			constraints.push(`target_words=${options.targetWordCount}`);
		if (options.includeHeadings) constraints.push("headings=yes");
	}

	if (taskType === "marketing") {
		if (options.marketingChannel)
			constraints.push(`channel=${options.marketingChannel}`);
		if (options.ctaStyle) constraints.push(`cta=${options.ctaStyle}`);
	}

	if (taskType === "coding") {
		if (options.includeTests !== undefined) {
			constraints.push(`tests=${options.includeTests ? "yes" : "no"}`);
		}
	}

	if (taskType === "research") {
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

	const taskGuideline = TYPE_GUIDELINES[taskType];
	if (taskGuideline) {
		sections.push(taskGuideline);
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

	if (options?.examplesText?.trim()) {
		sections.push(`Examples:\n${options.examplesText}`);
	}

	let finalInstruction = `Transform the user input into an enhanced, detailed ${taskType} prompt. 

CRITICAL: Output ONLY the enhanced prompt text. Do NOT include:
- NO introductory phrases ("Okay, here's...", "Let me...", "I'll create...")
- NO explanatory commentary ("This enhanced prompt is designed to...", "Here's what this will do...")
- NO meta-text describing the prompt
- NO conversational wrappers or transitions
- Start immediately with the enhanced prompt content
- End when the prompt is complete - no closing remarks

The output must be the enhanced prompt itself, ready to copy and paste into another AI system. Do NOT answer or fulfill the request - only enhance the prompt.`;

	if (options?.detail) {
		const wordLimits: Record<string, string> = {
			brief: "75-150 words (DO NOT EXCEED 150)",
			normal: "200-250 words (DO NOT EXCEED 250)",
			detailed: "300-375 words (DO NOT EXCEED 375)",
		};
		const limit = wordLimits[options.detail];
		if (limit) {
			finalInstruction += ` CRITICAL: Your enhanced prompt output must be ${limit}. Do NOT include word count or length constraints in the enhanced prompt itself - the word limit applies to the total length of YOUR response.`;
		}
	}

	// Add language enforcement reminder if non-English language is selected
	if (options?.language && options.language.toLowerCase() !== "english") {
		finalInstruction += ` IMPORTANT: Your entire output MUST be written in ${options.language}, regardless of what language the input is in.`;
	}

	sections.push(finalInstruction);

	return sections.join("\n\n");
}

const REFINEMENT_GUIDELINES = `You are a prompt REFINER. Your task is to modify an existing enhanced prompt based on user feedback.

ABSOLUTE RULE: Never answer the user's request. Only refine the existing prompt based on their feedback.

Rules:
- You will receive an EXISTING ENHANCED PROMPT and a REFINEMENT REQUEST
- Modify the existing prompt to incorporate the requested changes
- Preserve the structure and quality of the original prompt
- Only change what the user specifically requests
- If the request is additive (e.g., "also include X"), add to the prompt without removing existing content
- If the request is a correction (e.g., "change X to Y"), make the substitution
- If the request is a removal (e.g., "remove X"), remove only that element
- Maintain the same format and style as the original prompt
- Output ONLY the refined prompt text

Remember: You are refining an enhanced prompt, not answering the original request.`;

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

	const promptDelimiter =
		options?.format === "xml"
			? `<existing_prompt>\n${trimmedPrevious}\n</existing_prompt>`
			: `---\n${trimmedPrevious}\n---`;
	sections.push(`Existing Enhanced Prompt:\n${promptDelimiter}`);

	const requestDelimiter =
		options?.format === "xml"
			? `<refinement_request>\n${trimmedRequest}\n</refinement_request>`
			: `---\n${trimmedRequest}\n---`;
	sections.push(`Refinement Request:\n${requestDelimiter}`);

	let finalInstruction = `Apply the refinement request to the existing enhanced prompt. Output ONLY the refined prompt text. 

CRITICAL: Do NOT include:
- NO introductory phrases ("Okay, here's...", "Let me...", "I've updated...")
- NO explanatory commentary about what changed
- NO meta-text describing the refinement
- NO conversational wrappers
- Start immediately with the refined prompt content
- End when the prompt is complete - no closing remarks`;

	if (options?.detail) {
		const wordLimits: Record<string, string> = {
			brief: "75-150 words (DO NOT EXCEED 150)",
			normal: "200-250 words (DO NOT EXCEED 250)",
			detailed: "300-375 words (DO NOT EXCEED 375)",
		};
		const limit = wordLimits[options.detail];
		if (limit) {
			finalInstruction += ` CRITICAL: Your refined prompt output must be ${limit}.`;
		}
	}

	// Add language enforcement reminder if non-English language is selected
	if (options?.language && options.language.toLowerCase() !== "english") {
		finalInstruction += ` IMPORTANT: Your entire output MUST be written in ${options.language}.`;
	}

	sections.push(finalInstruction);

	return sections.join("\n\n");
}

export { buildDirectives as buildOptionDirectives } from "./prompt-directives";
