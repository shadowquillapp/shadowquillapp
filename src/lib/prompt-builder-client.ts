/**
 * Client-side prompt builder wrapper
 * Uses localStorage for system prompt storage and caching for performance
 */
import {
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
import { DEFAULT_BUILD_PROMPT, ensureSystemPromptBuild } from "./system-prompts";

export interface BuildPromptInput {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
	/** Skip cache lookup and generation (useful for forcing fresh generation) */
	skipCache?: boolean;
}

/**
 * Build a unified prompt with multi-level caching
 * 
 * Cache hierarchy:
 * 1. In-memory LRU cache (fastest, session-scoped)
 * 2. Session storage cache (persists across page reloads)
 * 3. Fresh generation (slowest, always accurate)
 * 
 * @param params - The prompt building parameters
 * @returns The generated or cached prompt string
 */
export async function buildUnifiedPrompt({
	input,
	taskType,
	options,
	skipCache = false,
}: BuildPromptInput): Promise<string> {
	const rawUserInput = input.trim();

	// Validate input first (always runs, no caching for validation)
	const validationError = validateBuilderInput(rawUserInput, taskType);
	if (validationError) return validationError;

	// Generate cache key
	const cacheKey = createPromptCacheKey(
		rawUserInput,
		taskType,
		options as Record<string, unknown>,
	);

	// Check caches if not skipping
	if (!skipCache) {
		// Level 1: In-memory cache
		const memCached = getPromptCache().get(cacheKey);
		if (memCached) {
			return memCached;
		}

		// Level 2: Session storage cache
		const sessionCached = getFromSessionCache(cacheKey);
		if (sessionCached) {
			// Promote to memory cache for faster subsequent access
			getPromptCache().set(cacheKey, sessionCached);
			return sessionCached;
		}
	}

	// Level 3: Generate fresh prompt
	const storedPrompt = ensureSystemPromptBuild();
	const systemPrompt = storedPrompt?.trim() || DEFAULT_BUILD_PROMPT;

	const generatedPrompt = buildUnifiedPromptCore({
		input: rawUserInput,
		taskType,
		systemPrompt,
		...(options && { options }),
	});

	// Store in both caches
	getPromptCache().set(cacheKey, generatedPrompt);
	saveToSessionCache(cacheKey, generatedPrompt);

	return generatedPrompt;
}

/**
 * Build a prompt without caching (for preview purposes)
 * Useful for real-time preview where we want fresh generation each time
 */
export async function buildPromptPreview({
	input,
	taskType,
	options,
}: Omit<BuildPromptInput, "skipCache">): Promise<string> {
	return buildUnifiedPrompt({ input, taskType, skipCache: true, ...(options && { options }) });
}

export { validateBuilderInput } from "@/lib/prompt-builder-core";
