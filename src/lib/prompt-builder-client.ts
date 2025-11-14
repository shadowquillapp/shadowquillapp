import type { GenerationOptions, TaskType } from "@/server/googleai";
import { getSystemPromptBuild } from "./system-prompts";

const PROMPTCRAFTER_SYSTEM_PROMPT = getSystemPromptBuild();
const LEGACY_BUILD_PROMPT_PREFIX = "You create one high";

const TYPE_GUIDELINES: Record<TaskType, string> = {
	general:
		"General: restate the goal clearly, enumerate key considerations, and clarify success criteria without drifting from the users topic.",
	coding:
		"Coding: build a full implementation prompt detailing objective, tech scope, environment/tooling, sequential steps, guardrails, and acceptance/verification criteria. Do not invent languages, frameworks, or meta fields unless explicitly given.",
	image:
		"Image: describe subject, context, composition, style, palette, lighting, and mood. Avoid meta commentary.",
	research:
		"Research: define the question, scope, evidence standard, required citations, and anti-hallucination guardrails.",
	writing:
		"Writing: specify audience, tone, structure, thematic beats, and stylistic constraints.",
	marketing:
		"Marketing: outline persona, value props, proof points, emotional drivers, CTA, and compliance limits.",
};

const UNIFIED_MODE_GUIDELINES: string = [
	"Strictly obey mode, task type, and constraints supplied by the user.",
	"Incorporate tone, detail level, audience, language, and formatting requirements exactly as provided.",
	"Expand the user request into a complete prompt: cover objective, context, scope boundaries, detailed steps, constraints, guardrails, and success checks. Do not merely restate the input.",
	"Do not include answers, rationales, meta commentary, or code fences. Output the prompt only.",
	"Prefer measurable criteria over vague language, and keep wording precise.",
	"Ensure the output is ready for direct copy-paste and preserves all user-provided facts without contradiction.",
].join("\n");

export function validateBuilderInput(rawUserInput: string, taskType: TaskType): string | null {
	if (rawUserInput.length === 0) {
		return "User input rejected: Empty input. Please provide a prompt description or content to work with.";
	}
	const highConfidenceInjection = [
		/ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
		/forget\s+(everything|all)\s+(above|before|previous)/i,
		/disregard\s+(all\s+)?(above|previous)\s+(instructions?|prompts?)/i,
		/you\s+are\s+(no\s+longer|now)\s+(a|an)\s+/i,
		/from\s+now\s+on\s+you\s+(will|are|should)/i,
		/act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+(different|new)\s+/i,
		/override\s+(system|default|previous)\s+(settings?|instructions?)/i,
		/reset\s+(your\s+)?(instructions?|parameters?|settings?)/i,
		/\b(jailbreak|DAN\s*v?\d*)\b(?!\s+(method|technique|prevention|detection))/i,
		/developer\s+mode(?!\s+(discussion|prevention|security))/i,
	].some((pattern) => pattern.test(rawUserInput));
	if (highConfidenceInjection) {
		return "User input rejected: Potential prompt injection detected. Please focus on describing the prompt content you want created.";
	}
	const signals = {
		isSimpleQuestion: /^(what|who|when|where|why|how)\s+/i.test(rawUserInput),
		hasPromptIntent: /(prompt|write|create|generate|build|make|design|craft|develop|compose|draft)\b/i.test(rawUserInput),
		hasCreativeIntent:
			/(story|image|picture|poem|article|essay|letter|email|code|script|marketing|ad|description)\b/i.test(rawUserInput),
		isConversational: /^(can\s+you|could\s+you|would\s+you|please|thanks?|thank\s+you)/i.test(rawUserInput),
		wordCount: rawUserInput.split(/\s+/).filter(Boolean).length,
		hasRichContent: rawUserInput.split(/[,;.]/).length > 2 || /\b(about|for|with|featuring|including|containing)\b/i.test(rawUserInput),
	};
	const likelyMisuse =
		signals.wordCount < 3 ||
		(signals.isSimpleQuestion && !signals.hasPromptIntent && !signals.hasCreativeIntent && signals.wordCount < 8 && !signals.hasRichContent);
	if (likelyMisuse) {
		return "User input rejected: Input appears too brief or conversational. Please describe what kind of prompt you want created or provide content to incorporate.";
	}
	return null;
}

function resolveSystemPrompt(stored?: string | null): string {
	const trimmed = (stored ?? "").trim();
	if (!trimmed) return PROMPTCRAFTER_SYSTEM_PROMPT;
	if (trimmed.startsWith(LEGACY_BUILD_PROMPT_PREFIX)) return PROMPTCRAFTER_SYSTEM_PROMPT;
	return trimmed;
}

function buildOptionDirectives(taskType: TaskType, options?: GenerationOptions): string[] {
	if (!options) return [];
	const directives: string[] = [];
	if (options.tone) {
		const toneMap: Record<NonNullable<GenerationOptions["tone"]>, string> = {
			neutral: "Maintain a neutral, matter-of-fact tone with no embellishment.",
			friendly: "Keep the tone friendly and encouraging while staying professional.",
			formal: "Use precise, formal wording with no colloquialisms.",
			technical: "Use technical language, naming concrete systems, files, and implementation details.",
			persuasive: "Emphasize benefits and rationale in a persuasive tone.",
		};
		directives.push(toneMap[options.tone] ?? `Maintain a ${options.tone} tone.`);
	}
	if (options.detail) {
		const detailMap: Record<"brief" | "normal" | "detailed", string> = {
			brief: "Keep the prompt short—no more than two concise sentences covering the essentials.",
			normal: "Provide balanced depth: include objective, key constraints, and success criteria.",
			detailed:
				"Provide rich detail: include background, explicit objectives, scope boundaries, sequential steps, guardrails, edge cases, and validation criteria. Use at least five distinct sentences or bullet lines.",
		};
		directives.push(detailMap[options.detail]);
	}
	if (options.format === "markdown") {
		directives.push("Use markdown bullet lists to enumerate steps, constraints, and validation criteria. Do not add headings or labeled sections.");
	} else if (options.format === "json") {
		directives.push("Phrase the prompt so it can be embedded safely inside JSON (avoid stray quotes or markdown artifacts).");
	} else if (options.format === "plain") {
		directives.push("Keep the final output plain text with no markdown syntax.");
	}
	if (options.language && options.language.toLowerCase() !== "english") {
		directives.push(`Write the entire prompt in ${options.language}.`);
	}
	if (options.audience) {
		directives.push(`Address the instructions to ${options.audience}.`);
	}
	if (options.styleGuidelines) {
		directives.push(`Incorporate these style guidelines verbatim: ${options.styleGuidelines}`);
	}
	if (taskType === "coding") {
		const hasIncludePref = Object.prototype.hasOwnProperty.call(options, "includeTests");
		if (hasIncludePref) {
			directives.push(options.includeTests ? "Explicitly require automated tests or validation steps." : "Do not mention tests or testing frameworks anywhere in the prompt.");
		}
	}
	if (taskType === "research") {
		const hasCitationPref = Object.prototype.hasOwnProperty.call(options, "requireCitations");
		if (hasCitationPref) {
			directives.push(options.requireCitations ? "Require cited sources with each claim." : "Do not ask for citations.");
		}
	}
	if (taskType === "image") {
		if (options.stylePreset) directives.push(`Use the ${options.stylePreset} visual style.`);
		if (options.aspectRatio) directives.push(`Target an aspect ratio of ${options.aspectRatio}.`);
	}
	return directives;
}

export async function buildUnifiedPrompt({
	input,
	taskType,
	options,
}: {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
}): Promise<string> {
	const rawUserInput = input.trim();
	const validationError = validateBuilderInput(rawUserInput, taskType);
	if (validationError) return validationError;
	const storedSystemPrompt = PROMPTCRAFTER_SYSTEM_PROMPT;
	const systemPrompt = resolveSystemPrompt(storedSystemPrompt);
	const constraintParts: string[] = [];
	if (options?.tone) constraintParts.push(`tone=${options.tone}`);
	if (options?.detail) constraintParts.push(`detail=${options.detail}`);
	if (options?.audience) constraintParts.push(`audience=${options.audience}`);
	if (options?.language && options.language.toLowerCase() !== "english") constraintParts.push(`lang=${options.language}`);
	if (options?.format) constraintParts.push(`format=${options.format}`);
	if (taskType === "image") {
		if (options?.stylePreset) constraintParts.push(`style=${options.stylePreset}`);
		if (options?.aspectRatio) constraintParts.push(`ratio=${options.aspectRatio}`);
	}
	if (taskType === "coding") {
		const hasIncludePref = options && Object.prototype.hasOwnProperty.call(options, "includeTests");
		if (hasIncludePref) constraintParts.push(`tests=${options?.includeTests ? "yes" : "no"}`);
	}
	if (taskType === "research") {
		const hasCitationPref = options && Object.prototype.hasOwnProperty.call(options, "requireCitations");
		if (hasCitationPref) constraintParts.push(`citations=${options?.requireCitations ? "yes" : "no"}`);
	}
	const typeGuidelines = TYPE_GUIDELINES[taskType];
	const optionDirectives = buildOptionDirectives(taskType, options);
	const lines: string[] = [];
	if (systemPrompt) lines.push(systemPrompt);
	lines.push(UNIFIED_MODE_GUIDELINES);
	if (typeGuidelines) lines.push(typeGuidelines);
	if (optionDirectives.length) {
		lines.push(`Directives:\n${optionDirectives.map((d) => `- ${d}`).join("\n")}`);
	}
	if (constraintParts.length) lines.push(`Constraints: ${constraintParts.join(", ")}`);
	lines.push(`Input: ${rawUserInput}`);
	lines.push("One output only. If insufficient detail, reply INPUT_INSUFFICIENT.");
	return lines.join("\n\n");
}


