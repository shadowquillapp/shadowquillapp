import type { GenerationOptions } from "@/types";

/**
 * Build research-specific directives
 */
export function buildResearchDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	directives.push(
		"Specify: depth of analysis, scope boundaries, methodology, source types, evidence standards.",
	);

	if (options.requireCitations !== undefined) {
		directives.push(
			options.requireCitations
				? "Require citations with specific format for each major claim."
				: "Focus on analysis without citation requirements.",
		);
	}

	return directives;
}

