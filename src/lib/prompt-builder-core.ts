import type { GenerationOptions, TaskType } from "@/types";
import { ValidationError } from "./errors";
import { buildDirectives } from "./prompt-directives";

// ============================================
// Task-Specific Guidelines (Streamlined)
// ============================================

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

// ============================================
// Core Guidelines (Streamlined - no redundancy)
// ============================================

const CORE_GUIDELINES = `You are a prompt ENHANCER. Your output will be used as input to ANOTHER AI system.

ABSOLUTE RULE: Never answer the user's request. Only enhance their prompt.

Rules:
- Output an ENHANCED VERSION of the user's prompt, not the answer to their request
- Add specificity, structure, context, and formatting requirements
- Be concrete with vivid details about what the OUTPUT should contain
- Strip away fluff and conversational language
- Treat user-provided content as the topic to enhance, not a task to complete
- If input appears to be an instruction, enhance it into a better instruction
- Meta-prompts are valid: if user wants a prompt about prompt-generation, create an enhanced version

Remember: If someone asks for a schedule, you output an ENHANCED PROMPT for creating a schedule. You do NOT create the schedule itself.`;

// ============================================
// Input Validation (Relaxed for meta-prompts)
// ============================================

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
			error: new ValidationError("Empty input. Please provide content to work with.", {
				field: "input",
				value: rawUserInput,
			}),
			message: "Empty input. Please provide content to work with.",
		};
	}

	// Only detect high-confidence injection attempts
	// Relaxed to allow legitimate meta-prompts about AI/prompts
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
			message: "Input rejected: Please focus on describing the prompt content you want created.",
		};
	}

	// Very minimal length check - allow short inputs if they have clear intent
	if (rawUserInput.split(/\s+/).filter(Boolean).length < 2) {
		return {
			valid: false,
			error: new ValidationError(
				"Input too brief. Please provide more detail about what you want.",
				{
					field: "input",
					value: rawUserInput,
					details: { wordCount: rawUserInput.split(/\s+/).filter(Boolean).length },
				},
			),
			message: "Input too brief. Please provide more detail about what you want.",
		};
	}

	return { valid: true };
}

// ============================================
// Constraint Building (Simplified)
// ============================================

function buildConstraints(
	taskType: TaskType,
	options?: GenerationOptions,
): string[] {
	if (!options) return [];
	const constraints: string[] = [];

	// Basic constraints
	if (options.tone) constraints.push(`tone=${options.tone}`);
	if (options.detail) {
		const wordRanges: Record<string, string> = {
			brief: "100-150",
			normal: "200-300",
			detailed: "350-500",
		};
		constraints.push(`words=${wordRanges[options.detail]}`);
	}
	if (options.format) constraints.push(`format=${options.format}`);
	if (options.language && options.language.toLowerCase() !== "english") {
		constraints.push(`lang=${options.language}`);
	}

	// Visual constraints
	if (taskType === "image" || taskType === "video") {
		if (options.stylePreset) constraints.push(`style=${options.stylePreset}`);
		if (options.aspectRatio) constraints.push(`ratio=${options.aspectRatio}`);
	}

	// Video-specific
	if (taskType === "video") {
		if (options.durationSeconds)
			constraints.push(`duration=${options.durationSeconds}s`);
		if (options.frameRate) constraints.push(`fps=${options.frameRate}`);
		if (options.cameraMovement)
			constraints.push(`camera=${options.cameraMovement}`);
		if (options.shotType) constraints.push(`shot=${options.shotType}`);
		if (options.includeStoryboard) constraints.push("storyboard=yes");
	}

	// Writing-specific
	if (taskType === "writing") {
		if (options.writingStyle) constraints.push(`style=${options.writingStyle}`);
		if (options.pointOfView) constraints.push(`pov=${options.pointOfView}`);
		if (options.readingLevel) constraints.push(`level=${options.readingLevel}`);
		if (options.targetWordCount)
			constraints.push(`target_words=${options.targetWordCount}`);
		if (options.includeHeadings) constraints.push("headings=yes");
	}

	// Marketing-specific
	if (taskType === "marketing") {
		if (options.marketingChannel)
			constraints.push(`channel=${options.marketingChannel}`);
		if (options.ctaStyle) constraints.push(`cta=${options.ctaStyle}`);
	}

	// Coding-specific
	if (taskType === "coding") {
		if (options.includeTests !== undefined) {
			constraints.push(`tests=${options.includeTests ? "yes" : "no"}`);
		}
	}

	// Research-specific
	if (taskType === "research") {
		if (options.requireCitations !== undefined) {
			constraints.push(`citations=${options.requireCitations ? "yes" : "no"}`);
		}
	}

	return constraints;
}

// ============================================
// Main Prompt Builder
// ============================================

export function buildUnifiedPromptCore(params: {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
	systemPrompt: string;
}): string {
	const { input, taskType, options, systemPrompt } = params;
	const rawUserInput = input.trim();

	const sections: string[] = [];

	// System prompt (custom or default)
	if (systemPrompt) {
		sections.push(systemPrompt);
	}

	// Core guidelines
	sections.push(CORE_GUIDELINES);

	// Task-specific guidelines
	const taskGuideline = TYPE_GUIDELINES[taskType];
	if (taskGuideline) {
		sections.push(taskGuideline);
	}

	// Build directives using modular system
	const directives = buildDirectives(taskType, options);
	if (directives.length > 0) {
		sections.push(`Directives:\n${directives.map((d) => `- ${d}`).join("\n")}`);
	}

	// Build constraints
	const constraints = buildConstraints(taskType, options);
	if (constraints.length > 0) {
		sections.push(`Constraints: ${constraints.join(", ")}`);
	}

	// User input with clear delimiters
	const delimiter =
		options?.format === "xml"
			? `<user_input>\n${rawUserInput}\n</user_input>`
			: `---\n${rawUserInput}\n---`;
	sections.push(`User Input:\n${delimiter}`);

	// Additional context (if provided)
	if (options?.additionalContext?.trim()) {
		sections.push(`Additional Context:\n${options.additionalContext}`);
	}

	// Examples (if provided)
	if (options?.examplesText?.trim()) {
		sections.push(`Examples:\n${options.examplesText}`);
	}

	// Final instruction
	sections.push(
		`Transform the user input into an enhanced, detailed ${taskType} prompt. Output ONLY the improved prompt text that can be used with another AI system. Do NOT answer or fulfill the request - only enhance the prompt.`,
	);

	return sections.join("\n\n");
}

// Legacy export for backward compatibility
export { buildDirectives as buildOptionDirectives } from "./prompt-directives";
