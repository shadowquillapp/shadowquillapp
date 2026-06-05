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

	// Detail level / word count - STRICT ENFORCEMENT (applies to YOUR output, not to be included in the compiled prompt)
	if (options.detail) {
		const wordLimits: Record<
			string,
			{ min: number; max: number; description: string }
		> = {
			brief: { min: 75, max: 150, description: "Brief (75-150 words)" },
			normal: { min: 200, max: 250, description: "Normal (200-250 words)" },
			detailed: { min: 300, max: 375, description: "Detailed (300-375 words)" },
		};
		const limit = wordLimits[options.detail];
		if (limit) {
			directives.push(
				`OUTPUT LENGTH REQUIREMENT: Your compiled prompt must be ${limit.description}. This is a constraint on YOUR output length - do NOT include word count constraints in the compiled prompt itself. Exceeding ${limit.max} words is NOT acceptable.`,
			);
		}
	}

	// Language - strong enforcement for non-English output
	if (options.language && options.language.toLowerCase() !== "english") {
		directives.push(
			`LANGUAGE REQUIREMENT: The compiled prompt output MUST be written entirely in ${options.language}. Even if the user's input is in English or another language, your output must be in ${options.language}. This is non-negotiable.`,
		);
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
			const schema = getDefaultXMLSchema(taskType, options);
			directives.push(schema);
		}
	} else if (options.format === "plain") {
		directives.push("Format: Plain text only, no markdown or special syntax.");
	}

	return directives;
}

/**
 * Get the default XML schema for a task type (explicit opt-in via format: xml).
 * Schemas are not default compiler behavior — only applied when preset requests XML.
 */
function getDefaultXMLSchema(
	taskType: TaskType,
	options: GenerationOptions,
): string {
	// For visual prompts, inject actual resolution and aspect ratio values
	if (taskType === "visual") {
		const resolution = options.targetResolution ?? "1080p";
		const aspectRatio = options.aspectRatio ?? "16:9";
		const style = options.stylePreset ?? "photorealistic";

		return `XML FORMAT - Use this EXACT structure with the specified values:
<image_prompt>
  <subject>[Main subject - concise description]</subject>
  <environment>[Setting/background - focused keywords]</environment>
  <composition>[Framing, perspective - brief]</composition>
  <visual_style style="${style}">[Style-appropriate keywords only]</visual_style>
  <specs resolution="${resolution}" aspect="${aspectRatio}"/>
</image_prompt>
IMPORTANT: Use EXACTLY resolution="${resolution}" and aspect="${aspectRatio}" - do NOT change these values.`;
	}

	// For motion prompts, inject actual values
	if (taskType === "motion") {
		const resolution = options.targetResolution ?? "1080p";
		const aspectRatio = options.aspectRatio ?? "16:9";
		const fps = options.frameRate ?? 24;
		const duration = options.durationSeconds ?? 5;

		return `XML FORMAT - Use this EXACT structure with the specified values:
<video_prompt>
  <subject>[Main subject - concise]</subject>
  <action>[Movement/action - brief]</action>
  <environment>[Setting - focused keywords]</environment>
  <visual_style>[Style keywords]</visual_style>
  <camera_motion>[Camera movement type]</camera_motion>
  <specs resolution="${resolution}" aspect="${aspectRatio}" fps="${fps}" duration="${duration}s"/>
</video_prompt>
IMPORTANT: Use these EXACT specs - do NOT change or invent values.`;
	}

	// Default schemas for other task types
	const defaultSchemas: Record<TaskType, string> = {
		visual: "", // Handled above
		motion: "", // Handled above
		engineering:
			"XML: <engineering_task> with <objective>, <tech_stack>, <requirements>, <constraints>",
		narrative:
			"XML: <narrative_prompt> with <topic>, <audience>, <style_guide>, <structure>, <key_points>",
		analysis:
			"XML: <analysis_task> with <core_question>, <scope>, <methodology>, <source_requirements>, <deliverables>",
		persuasion:
			"XML: <persuasion_content> with <target_audience>, <core_message>, <value_props>, <channel_specs>, <call_to_action>",
		intent: "XML: <prompt> with <goal>, <context>, <requirements>, <style>",
	};

	return defaultSchemas[taskType] ?? defaultSchemas.intent;
}

/**
 * Build advanced setting directives
 */
export function buildAdvancedDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	if (options.endOfPromptToken) {
		directives.push(`End with: ${options.endOfPromptToken}`);
	}

	return directives;
}
