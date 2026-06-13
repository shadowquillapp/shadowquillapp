import {
	buildRefinementPromptCore,
	buildUnifiedPromptCore,
	validateBuilderInput,
} from "@/lib/prompt-builder-core";
import type { GenerationOptions, TaskType } from "@/types";
import {
	createPromptCacheKey,
	getFromSessionCache,
	getPromptCache,
	saveToSessionCache,
} from "./cache";
import { ValidationError } from "./errors";
import { ensureSystemPromptBuild } from "./system-prompts";

export interface BuildPromptInput {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
	skipCache?: boolean;
}

export async function buildUnifiedPrompt({
	input,
	taskType,
	options,
	skipCache = false,
}: BuildPromptInput): Promise<string> {
	const rawUserInput = input.trim();

	const validationError = validateBuilderInput(rawUserInput, taskType);
	if (validationError) throw new ValidationError(validationError);

	const systemPrompt = ensureSystemPromptBuild();
	const cacheOptions: Record<string, unknown> = {
		...(options ?? {}),
		systemPrompt,
	};

	const cacheKey = createPromptCacheKey(rawUserInput, taskType, cacheOptions);

	if (!skipCache) {
		const memCached = getPromptCache().get(cacheKey);
		if (memCached) {
			return memCached;
		}

		const sessionCached = getFromSessionCache(cacheKey);
		if (sessionCached) {
			getPromptCache().set(cacheKey, sessionCached);
			return sessionCached;
		}
	}

	const generatedPrompt = buildUnifiedPromptCore({
		input: rawUserInput,
		taskType,
		systemPrompt,
		...(options && { options }),
	});

	getPromptCache().set(cacheKey, generatedPrompt);
	saveToSessionCache(cacheKey, generatedPrompt);

	return generatedPrompt;
}

export interface BuildRefinementPromptInput {
	previousOutput: string;
	refinementRequest: string;
	taskType: TaskType;
	options?: GenerationOptions;
}

export async function buildRefinementPrompt({
	previousOutput,
	refinementRequest,
	taskType,
	options,
}: BuildRefinementPromptInput): Promise<string> {
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
