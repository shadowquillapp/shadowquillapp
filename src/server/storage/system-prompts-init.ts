import fs from 'fs/promises';
import path from 'path';
import { resolveDataDir } from './data-path';
import { dataLayer } from './data-layer';

// Use hardcoded default system prompts
export interface SystemPromptsDefault {
  build: string;
  enhance: string;
  version: string;
}

// Default system prompts - hardcoded as backup in case file reading fails
const DEFAULT_BUILD_PROMPT = `You create one high‑performance prompt.

- Follow task and constraints.
- Be concise; no meta talk.
- Output exactly one prompt; no code fences.

Structure:
1) Instructions
2) Inputs
3) Steps/Policy
4) Constraints`;

const DEFAULT_ENHANCE_PROMPT = `You tighten an existing prompt.

- Keep intent; remove fluff.
- Add only missing constraints that improve reliability.
- Output only the improved prompt; no code fences or commentary.

Structure:
1) Instructions
2) Key inputs/assumptions
3) Steps/Policy
4) Constraints`;

// Initialize system prompts default file
export async function ensureSystemPromptsDefaultFile(): Promise<SystemPromptsDefault> {
  const dataDir = resolveDataDir();
  const defaultFilePath = path.join(dataDir, 'system-prompts-default.json');
  
  try {
    // Try to read the existing default file
    console.log('Attempting to read system prompts from:', defaultFilePath);
    const content = await fs.readFile(defaultFilePath, 'utf-8');
    const defaults = JSON.parse(content) as SystemPromptsDefault;
    console.log('Successfully loaded system prompts from file');
    return defaults;
  } catch (error) {
    console.log('System prompts file not found or invalid, creating new one...');
    // File doesn't exist or can't be read, create it
    try {
      console.log('Using hardcoded default system prompts');
      const buildContent = DEFAULT_BUILD_PROMPT;
      const enhanceContent = DEFAULT_ENHANCE_PROMPT;
      
      const defaults: SystemPromptsDefault = {
        build: buildContent.trim(),
        enhance: enhanceContent.trim(),
        version: '1.1.0'
      };
      
      // Ensure the data directory exists
      await fs.mkdir(dataDir, { recursive: true });
      
      // Write the defaults to the file
      console.log('Writing system prompts defaults to:', defaultFilePath);
      await fs.writeFile(defaultFilePath, JSON.stringify(defaults, null, 2), 'utf-8');
      
      return defaults;
    } catch (initError) {
      console.error('Failed to initialize system-prompts-default.json:', initError);
      // Fallback to hardcoded defaults
      console.log('Using hardcoded defaults as last resort');
      return {
        build: DEFAULT_BUILD_PROMPT,
        enhance: DEFAULT_ENHANCE_PROMPT,
        version: '1.1.0'
      };
    }
  }
}

// Initialize system prompts in app settings if they don't exist or are empty
export async function initializeSystemPrompts(): Promise<void> {
  console.log('Initializing system prompts...');
  try {
    // Check if system prompts already exist in app settings
    const buildPrompt = await dataLayer.findAppSetting('SYSTEM_PROMPT_BUILD');
    const enhancePrompt = await dataLayer.findAppSetting('SYSTEM_PROMPT_ENHANCE');
    
    // Get the defaults regardless - will either read from file or create from MD files
    const defaults = await ensureSystemPromptsDefaultFile();
    console.log('System prompts default file loaded/created successfully');
    
    // Always check if prompts exist and are not empty
    const needsBuildPrompt = !buildPrompt?.value || buildPrompt.value.trim() === '';
    const needsEnhancePrompt = !enhancePrompt?.value || enhancePrompt.value.trim() === '';
    
    if (needsBuildPrompt) {
      console.log('Setting BUILD system prompt from defaults');
      await dataLayer.upsertAppSetting('SYSTEM_PROMPT_BUILD', defaults.build);
    } else {
      console.log('BUILD system prompt already exists');
    }
    
    if (needsEnhancePrompt) {
      console.log('Setting ENHANCE system prompt from defaults');
      await dataLayer.upsertAppSetting('SYSTEM_PROMPT_ENHANCE', defaults.enhance);
    } else {
      console.log('ENHANCE system prompt already exists');
    }
    
    console.log('System prompts initialization complete');
  } catch (error) {
    console.error('Failed to initialize system prompts:', error);
    // Try one more time with hardcoded defaults
    try {
      await dataLayer.upsertAppSetting('SYSTEM_PROMPT_BUILD', DEFAULT_BUILD_PROMPT);
      await dataLayer.upsertAppSetting('SYSTEM_PROMPT_ENHANCE', DEFAULT_ENHANCE_PROMPT);
      console.log('System prompts initialized with hardcoded defaults after error');
    } catch (fallbackError) {
      console.error('Final fallback for system prompts failed:', fallbackError);
    }
  }
}
