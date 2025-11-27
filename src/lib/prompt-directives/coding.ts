import type { GenerationOptions } from "@/types";

/**
 * Build coding-specific directives
 */
export function buildCodingDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	// Core principle
	directives.push(
		"Use only information provided. Do not invent technologies or frameworks.",
	);

	// Tech stack
	if (options.techStack?.trim()) {
		directives.push(`Tech stack: ${options.techStack}`);
	} else {
		directives.push(
			"Tech stack: If not specified by user, state 'Not specified' - do not assume.",
		);
	}

	// Project context
	if (options.projectContext?.trim()) {
		directives.push(`Project context: ${options.projectContext}`);
	}

	// Constraints
	if (options.codingConstraints?.trim()) {
		directives.push(`Constraints: ${options.codingConstraints}`);
	}

	// Testing
	if (options.includeTests !== undefined) {
		directives.push(
			options.includeTests
				? "Include testing requirements (use general terms if specifics not provided)."
				: "Focus on implementation, no testing requirements.",
		);
	}

	return directives;
}

