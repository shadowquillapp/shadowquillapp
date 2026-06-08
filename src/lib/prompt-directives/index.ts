import type { GenerationOptions, TaskType } from "@/types";
import { buildBaseDirectives, buildFormatDirectives } from "./base";

export function buildDirectives(
	taskType: TaskType,
	options?: GenerationOptions,
): string[] {
	if (!options) return [];

	const directives: string[] = [];

	directives.push(...buildBaseDirectives(options));
	directives.push(...buildFormatDirectives(taskType, options));

	return directives.filter((d) => d.length > 0);
}

export { buildBaseDirectives, buildFormatDirectives } from "./base";
