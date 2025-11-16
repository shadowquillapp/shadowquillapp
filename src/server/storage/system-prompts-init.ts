import { DEFAULT_BUILD_PROMPT } from '@/lib/system-prompts';

export interface SystemPromptsDefault {
  build: string;
  version: string;
}

export async function ensureSystemPromptsDefaultFile(): Promise<SystemPromptsDefault> {
  return {
    build: DEFAULT_BUILD_PROMPT,
    version: '1.2.0'
  };
}