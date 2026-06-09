import type { GenerationOptions, TaskType } from "@/types";

export const DETAIL_WORD_LIMIT_DESCRIPTIONS: Record<
	string,
	{ min: number; max: number; description: string }
> = {
	normal: { min: 75, max: 150, description: "Normal (75-150 words)" },
	detailed: { min: 200, max: 250, description: "Detailed (200-250 words)" },
};

export const DETAIL_WORD_LIMIT_LABELS = Object.fromEntries(
	Object.entries(DETAIL_WORD_LIMIT_DESCRIPTIONS).map(([key, limit]) => [
		key,
		`${limit.min}-${limit.max} words (DO NOT EXCEED ${limit.max})`,
	]),
) as Record<string, string>;

export function isNonEnglishLanguage(language?: string): language is string {
	return !!language && language.toLowerCase() !== "english";
}

export function buildBaseDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

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

	if (options.detail) {
		const limit = DETAIL_WORD_LIMIT_DESCRIPTIONS[options.detail];
		if (limit) {
			directives.push(
				`OUTPUT LENGTH REQUIREMENT: Your compiled prompt must be ${limit.description}. This is a constraint on YOUR output length - do NOT include word count constraints in the compiled prompt itself. Exceeding ${limit.max} words is NOT acceptable.`,
			);
		}
	}

	if (isNonEnglishLanguage(options.language)) {
		directives.push(
			`LANGUAGE REQUIREMENT: The compiled prompt output MUST be written entirely in ${options.language}. Even if the user's input is in English or another language, your output must be in ${options.language}. This is non-negotiable.`,
		);
	}

	if (options.audience) {
		directives.push(`Target audience: ${options.audience}.`);
	}

	if (options.styleGuidelines) {
		directives.push(`Style guidelines: ${options.styleGuidelines}`);
	}

	return directives;
}

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
				visual:
					"XML: <image_prompt> with <subject>, <environment>, <composition>, <visual_style>",
				motion:
					"XML: <video_prompt> with <subject>, <action>, <environment>, <visual_style>, <camera_motion>",
				engineering:
					"XML: <engineering_task> with <objective>, <requirements>, <constraints>",
				narrative:
					"XML: <narrative_prompt> with <topic>, <audience>, <style_guide>, <structure>, <key_points>",
				analysis:
					"XML: <analysis_task> with <core_question>, <scope>, <methodology>, <source_requirements>, <deliverables>",
				persuasion:
					"XML: <persuasion_content> with <target_audience>, <core_message>, <value_props>, <call_to_action>",
				intent: "XML: <prompt> with <goal>, <context>, <requirements>, <style>",
			};
			directives.push(defaultSchemas[taskType] ?? defaultSchemas.intent);
		}
	} else if (options.format === "plain") {
		directives.push("Format: Plain text only, no markdown or special syntax.");
	}

	return directives;
}

export function buildDirectives(
	taskType: TaskType,
	options?: GenerationOptions,
): string[] {
	if (!options) return [];
	return [
		...buildBaseDirectives(options),
		...buildFormatDirectives(taskType, options),
	].filter((d) => d.length > 0);
}
