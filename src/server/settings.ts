import { dataLayer } from "@/server/storage/data-layer";
import { ensureSystemPromptsDefaultFile } from "@/server/storage/system-prompts-init";

const SYSTEM_PROMPT_BUILD_KEY = "SYSTEM_PROMPT_BUILD" as const;

export type PromptMode = "build";

export async function readSystemPromptForMode(mode: PromptMode): Promise<string | null> {
  const setting = await dataLayer.findAppSetting(SYSTEM_PROMPT_BUILD_KEY);
  if (setting?.value) return setting.value;
  
  // If no stored value, get from defaults file
  try {
    const defaults = await ensureSystemPromptsDefaultFile();
    return defaults.build;
  } catch (error) {
    console.error(`Failed to load default system prompt:`, error);
    return null;
  }
}

export async function writeSystemPromptForMode(mode: PromptMode, prompt: string): Promise<void> {
  await dataLayer.upsertAppSetting(SYSTEM_PROMPT_BUILD_KEY, prompt);
}

// NOTE: Legacy DB-based helper names removed.


