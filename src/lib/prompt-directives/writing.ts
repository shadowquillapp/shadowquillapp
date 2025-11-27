import type { GenerationOptions } from "@/types";

/**
 * Build writing-specific directives
 */
export function buildWritingDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	if (options.writingStyle) {
		const styleDescriptions: Record<string, string> = {
			narrative: "Narrative style with clear progression.",
			expository: "Expository style: explain and inform with clarity.",
			technical: "Technical style with precise terminology.",
			descriptive: "Descriptive style with vivid sensory details.",
		};
		directives.push(
			styleDescriptions[options.writingStyle] ??
				`Writing style: ${options.writingStyle}.`,
		);
	}

	if (options.pointOfView) {
		const povMap: Record<string, string> = {
			first: "POV: First person (I/we).",
			second: "POV: Second person (you).",
			third: "POV: Third person (he/she/they).",
		};
		directives.push(povMap[options.pointOfView] ?? "");
	}

	if (options.readingLevel) {
		const levelMap: Record<string, string> = {
			basic: "Reading level: Basic - simple vocabulary, short sentences.",
			intermediate: "Reading level: Intermediate - balanced complexity.",
			expert: "Reading level: Expert - advanced terminology.",
		};
		directives.push(levelMap[options.readingLevel] ?? "");
	}

	if (typeof options.targetWordCount === "number") {
		directives.push(`Target word count: ~${options.targetWordCount} words.`);
	}

	if (options.includeHeadings) {
		directives.push("Include section headings.");
	}

	return directives;
}

