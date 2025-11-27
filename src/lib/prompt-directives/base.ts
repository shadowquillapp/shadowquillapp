import type { GenerationOptions, TaskType } from "@/types";

/**
 * Build base directives that apply to all task types
 */
export function buildBaseDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	// Tone
	if (options.tone) {
		const toneMap: Record<string, string> = {
			neutral: "Use a neutral, matter-of-fact tone.",
			friendly: "Use a friendly, encouraging tone while staying professional.",
			formal: "Use precise, formal language with no colloquialisms.",
			technical: "Use technical language with concrete details.",
			persuasive: "Use a persuasive tone emphasizing benefits.",
		};
		directives.push(toneMap[options.tone] ?? `Use a ${options.tone} tone.`);
	}

	// Detail level / word count
	if (options.detail) {
		const wordRanges: Record<string, string> = {
			brief: "100-150",
			normal: "200-300",
			detailed: "350-500",
		};
		directives.push(`Word count: ${wordRanges[options.detail]} words.`);
	}

	// Language
	if (options.language && options.language.toLowerCase() !== "english") {
		directives.push(`Write in ${options.language}.`);
	}

	// Audience
	if (options.audience) {
		directives.push(`Target audience: ${options.audience}.`);
	}

	// Style guidelines
	if (options.styleGuidelines) {
		directives.push(`Style guidelines: ${options.styleGuidelines}`);
	}

	return directives;
}

/**
 * Build format-related directives
 */
export function buildFormatDirectives(
	taskType: TaskType,
	options: GenerationOptions,
): string[] {
	const directives: string[] = [];

	if (options.format === "markdown") {
		directives.push("Format: Use markdown (bullets, emphasis, headings).");
	} else if (options.format === "xml") {
		if (options.outputXMLSchema) {
			directives.push(
				`XML Schema: Follow this structure:\n${options.outputXMLSchema}`,
			);
		} else {
			const defaultSchemas: Record<TaskType, string> = {
				image:
					"XML: <image_prompt> with <subject>, <environment>, <composition>, <visual_style>, <technical_specs>",
				video:
					"XML: <video_prompt> with <subject>, <action>, <environment>, <visual_style>, <camera_motion>, <technical_specs>",
				coding:
					"XML: <coding_task> with <objective>, <tech_stack>, <requirements>, <constraints>",
				writing:
					"XML: <writing_prompt> with <topic>, <audience>, <style_guide>, <structure>, <key_points>",
				research:
					"XML: <research_task> with <core_question>, <scope>, <methodology>, <source_requirements>, <deliverables>",
				marketing:
					"XML: <marketing_content> with <target_audience>, <core_message>, <value_props>, <channel_specs>, <call_to_action>",
				general:
					"XML: <prompt> with <goal>, <context>, <requirements>, <style>",
			};
			directives.push(defaultSchemas[taskType]);
		}
	} else if (options.format === "plain") {
		directives.push("Format: Plain text only, no markdown or special syntax.");
	}

	return directives;
}

/**
 * Build advanced setting directives
 */
export function buildAdvancedDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	if (options.includeVerification) {
		directives.push("Include validation points or quality criteria.");
	}

	if (options.reasoningStyle && options.reasoningStyle !== "none") {
		const reasoningMap: Record<string, string> = {
			cot: "Think through each aspect systematically.",
			plan_then_solve: "Plan the approach first, then develop the solution.",
			tree_of_thought: "Consider multiple approaches, select the best one.",
		};
		directives.push(reasoningMap[options.reasoningStyle] ?? "");
	}

	if (options.endOfPromptToken) {
		directives.push(`End with: ${options.endOfPromptToken}`);
	}

	return directives;
}

