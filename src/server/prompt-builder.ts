import { readSystemPromptForMode } from '@/server/settings';
import type { TaskType, GenerationOptions } from '@/server/googleai';
import { buildUnifiedPromptCore, validateBuilderInput } from '@/lib/prompt-builder-core';
import { DEFAULT_BUILD_PROMPT } from '@/lib/system-prompts';

export interface BuildPromptInput {
  input: string;
  taskType: TaskType;
  options?: GenerationOptions;
}

export async function buildUnifiedPrompt({ input, taskType, options }: BuildPromptInput): Promise<string> {
  const rawUserInput = input.trim();
  const validationError = validateBuilderInput(rawUserInput, taskType);
  if (validationError) return validationError;

  const storedSystemPrompt = await readSystemPromptForMode('build');
  const systemPrompt = resolveSystemPrompt(storedSystemPrompt);
  const coreParams: { input: string; taskType: TaskType; systemPrompt: string; options?: GenerationOptions } = {
    input: rawUserInput,
    taskType,
    systemPrompt,
  };
  if (typeof options !== 'undefined') coreParams.options = options;
  return buildUnifiedPromptCore(coreParams);
}

function resolveSystemPrompt(stored?: string | null): string {
  const trimmed = (stored ?? '').trim();
  if (!trimmed) return DEFAULT_BUILD_PROMPT;
  return trimmed;
}

export { validateBuilderInput } from '@/lib/prompt-builder-core';