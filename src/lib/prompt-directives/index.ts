import type { GenerationOptions, TaskType } from "@/types";
import {
	buildAdvancedDirectives,
	buildBaseDirectives,
	buildFormatDirectives,
} from "./base";
import { buildCodingDirectives } from "./coding";
import { buildImageDirectives } from "./image";
import { buildMarketingDirectives } from "./marketing";
import { buildResearchDirectives } from "./research";
import { buildVideoDirectives } from "./video";
import { buildWritingDirectives } from "./writing";

/**
 * Build all directives for a given task type and options
 * This is the main entry point replacing the monolithic buildOptionDirectives
 */
export function buildDirectives(
	taskType: TaskType,
	options?: GenerationOptions,
): string[] {
	if (!options) return [];

	const directives: string[] = [];

	// Base directives (tone, detail, language, audience)
	directives.push(...buildBaseDirectives(options));

	// Format directives (markdown, xml, plain)
	directives.push(...buildFormatDirectives(taskType, options));

	// Task-specific directives
	switch (taskType) {
		case "image":
			directives.push(...buildImageDirectives(options));
			break;
		case "video":
			directives.push(...buildVideoDirectives(options));
			break;
		case "coding":
			directives.push(...buildCodingDirectives(options));
			break;
		case "writing":
			directives.push(...buildWritingDirectives(options));
			break;
		case "research":
			directives.push(...buildResearchDirectives(options));
			break;
		case "marketing":
			directives.push(...buildMarketingDirectives(options));
			break;
		case "general":
		default:
			// General has no additional task-specific directives
			break;
	}

	// Advanced directives (verification, reasoning, end token)
	directives.push(...buildAdvancedDirectives(options));

	// Filter out empty strings
	return directives.filter((d) => d.length > 0);
}

// Re-export individual builders for testing/customization
export {
	buildAdvancedDirectives,
	buildBaseDirectives,
	buildFormatDirectives,
} from "./base";
export { buildCodingDirectives } from "./coding";
export { buildImageDirectives } from "./image";
export { buildMarketingDirectives } from "./marketing";
export { buildResearchDirectives } from "./research";
export { buildVideoDirectives } from "./video";
export { buildWritingDirectives } from "./writing";

