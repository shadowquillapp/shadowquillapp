import { dataLayer } from './data-layer';

// Use hardcoded default system prompts
export interface SystemPromptsDefault {
  build: string;
  version: string;
}

// Default system prompts - hardcoded as backup in case file reading fails
const DEFAULT_BUILD_PROMPT = `You are PromptCrafter, an expert at authoring high-performance prompts for AI models.

Goal:
- Create a single, self-contained prompt from scratch that achieves the user's objective.

Behavior:
- Strictly obey any provided Mode, Task type, and Constraints.
- Incorporate tone, detail level, audience, language, and formatting requirements.
- Be precise, unambiguous, and concise; avoid filler and meta commentary.

Structure the final prompt (no extra explanation):
1) Instruction to the assistant (clear objective and role)
2) Inputs to consider (summarize and normalize the user input)
3) Steps/Policy (how to think, what to do, what to avoid)
4) Constraints and acceptance criteria (must/should; edge cases)
5) Output format (structure; if JSON is requested, specify keys and rules only)

Rules:
- Do not include code fences or rationale.
- Prefer measurable criteria over vague language.
- Ensure output is ready for direct copy-paste.`;

// Return hardcoded default system prompts (no file IO)
export async function ensureSystemPromptsDefaultFile(): Promise<SystemPromptsDefault> {
  return {
    build: DEFAULT_BUILD_PROMPT,
    version: '1.2.0'
  };
}

// Initialize system prompts in app settings if they don't exist or are empty
export async function initializeSystemPrompts(): Promise<void> {
  // No longer persisting system prompts server-side; rely on renderer localStorage.
  // This function becomes a no-op to avoid file/JSON storage.
  console.log('System prompts initialization skipped (renderer-managed).');
}
