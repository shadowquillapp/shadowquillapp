import type { GenerationOptions, TaskType } from "@/server/googleai";
import { DEFAULT_BUILD_PROMPT, ensureSystemPromptBuild } from "./system-prompts";
import { buildUnifiedPromptCore, validateBuilderInput } from "@/lib/prompt-builder-core";

function resolveSystemPrompt(stored?: string | null): string {
	const trimmed = (stored ?? "").trim();
	if (!trimmed) return DEFAULT_BUILD_PROMPT;
	return trimmed;
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
	const storedSystemPrompt = ensureSystemPromptBuild();
	const systemPrompt = resolveSystemPrompt(storedSystemPrompt);
	const coreParams: { input: string; taskType: TaskType; systemPrompt: string; options?: GenerationOptions } = {
		input: rawUserInput,
		taskType,
		systemPrompt,
	};
	if (typeof options !== "undefined") coreParams.options = options;
	return buildUnifiedPromptCore(coreParams);
}