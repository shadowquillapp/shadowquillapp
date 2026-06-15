import {
	buildRefinementPromptCore,
	buildUnifiedPromptCore,
	validateBuilderInput,
} from "@/lib/prompt-builder-core";
import type { GenerationOptions, TaskType } from "@/types";
import { ValidationError } from "./errors";
import {
	DEFAULT_BUILD_PROMPT,
	ensureSystemPromptBuild,
} from "./system-prompts";

export interface BuildPromptInput {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
}

export function buildUnifiedPrompt({
	input,
	taskType,
	options,
}: BuildPromptInput): string {
	const rawUserInput = input.trim();

	const validationError = validateBuilderInput(rawUserInput, taskType);
	if (validationError) throw new ValidationError(validationError);

	const storedPrompt = ensureSystemPromptBuild();
	const systemPrompt = storedPrompt?.trim() || DEFAULT_BUILD_PROMPT;

	return buildUnifiedPromptCore({
		input: rawUserInput,
		taskType,
		systemPrompt,
		...(options && { options }),
	});
}

export interface BuildRefinementPromptInput {
	previousOutput: string;
	refinementRequest: string;
	taskType: TaskType;
	options?: GenerationOptions;
}

export function buildRefinementPrompt({
	previousOutput,
	refinementRequest,
	taskType,
	options,
}: BuildRefinementPromptInput): string {
	const trimmedRequest = refinementRequest.trim();

	if (!trimmedRequest) {
		throw new ValidationError(
			"Please provide a refinement request describing what to change.",
		);
	}

	return buildRefinementPromptCore({
		previousOutput,
		refinementRequest: trimmedRequest,
		taskType,
		...(options && { options }),
	});
}

export { validateBuilderInput } from "@/lib/prompt-builder-core";
