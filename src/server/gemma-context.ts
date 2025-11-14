import { readSystemPromptForMode } from '@/server/settings';
import { env } from '@/env';

/**
 * GEMMA 3B 1B OPTIMIZED CONTEXTUALIZATION SYSTEM
 * 
 * Design principles:
 * - Minimal context overhead for small model capacity
 * - Clear priority ordering (mode > task > format)
 * - Direct instruction style without nested complexity
 * - Essential constraints only
 */

export type PromptMode = "build";
export type TaskType = "general" | "coding" | "image" | "research" | "writing" | "marketing" | "video";

export interface GenerationOptions {
  tone?: "neutral" | "friendly" | "formal" | "technical" | "persuasive" | undefined;
  detail?: "brief" | "normal" | "detailed" | undefined;
  format?: "plain" | "markdown" | "json" | undefined;
  audience?: string | undefined;
  language?: string | undefined;
  temperature?: number | undefined;
  // Task-specific
  stylePreset?: "photorealistic" | "illustration" | "3d" | "anime" | "watercolor" | "cinematic" | "documentary" | "animation" | "timelapse" | "vlog" | undefined;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | undefined;
  includeTests?: boolean | undefined;
  requireCitations?: boolean | undefined;
  // Video-specific
  cameraMovement?: "static" | "pan" | "tilt" | "dolly" | "zoom" | "handheld" | "tracking" | undefined;
  shotType?: "wide" | "medium" | "close_up" | "over_the_shoulder" | "first_person" | undefined;
  durationSeconds?: number | undefined;
  frameRate?: 24 | 30 | 60 | undefined;
}

export interface BuildPromptInput {
  input: string;
  taskType: TaskType;
  options?: GenerationOptions;
}

/**
 * Core contextualization function - builds minimal, focused context for Gemma 3B 1B
 */
export async function buildGemmaContext({ input, taskType, options }: BuildPromptInput): Promise<string> {
  // Input validation - reject empty/trivial inputs
  const cleanInput = input.trim();
  if (!cleanInput || cleanInput.length < 3) {
    return "ERROR: Input too short. Provide clear objective.";
  }

  // Basic instruction based on mode
  const modeInstruction = getModeInstruction();
  
  // Task-specific guidance (only essential rules)
  const taskGuidance = getTaskGuidance(taskType);
  
  // Format constraint (critical for output structure)
  const formatRule = getFormatRule(options?.format || 'plain');
  
  // Essential options only (avoid overwhelming small model)
  const essentialOptions = getEssentialOptions(options, taskType);

  // Build minimal context - order matters for small models
  const contextParts = [
    modeInstruction,
    taskGuidance,
    formatRule,
    essentialOptions,
    `Input: ${cleanInput}`,
    "Output:"
  ].filter(Boolean);

  return contextParts.join('\n\n');
}

/**
 * Mode-specific instructions - keep concise for Gemma 3B 1B
 */
function getModeInstruction(): string {
  return "Create one prompt.";
}

/**
 * Task guidance - only essential rules per task type
 */
function getTaskGuidance(taskType: TaskType): string {
  switch (taskType) {
    case 'image':
      return "Image: subject, context, style, lighting. Use commas.";
    case 'video':
      return "Video: subject, actions, setting, pacing; shot type, camera movement, lighting, transitions; specify duration and aspect.";
    case 'coding':
      return "Coding: produce a concise prompt for a coding task. Do not add meta fields (Language, Environment, I/O, Tech stack) unless explicitly given. Do not invent tools or languages.";
    case 'research':
      return "Research: question, scope, evidence level.";
    case 'writing':
      return "Writing: audience, tone, format, key points.";
    case 'marketing':
      return "Marketing: product, audience, benefits, CTA.";
    case 'general':
    default:
      return "Be clear and specific about the outcome.";
  }
}

/**
 * Format rules - critical for output structure
 */
function getFormatRule(format: string): string {
  switch (format) {
    case 'json':
      return "Return valid JSON only. No extra text.";
    case 'markdown':
      return "Return markdown only. No headings or labels.";
    case 'plain':
    default:
      return "Return plain text only. No labels.";
  }
}

/**
 * Essential options processing - minimal context for small model
 */
function getEssentialOptions(options?: GenerationOptions, taskType?: TaskType): string {
  if (!options) return "";

  const rules: string[] = [];

  // Core options
  if (options.tone) {
    rules.push(`Tone: ${options.tone}`);
  }
  
  if (options.detail) {
    const detailMap = {
      'brief': 'Keep concise',
      'normal': 'Include key details', 
      'detailed': 'Be comprehensive'
    };
    rules.push(detailMap[options.detail] || 'Include key details');
  }

  if (options.language && options.language !== 'English') {
    rules.push(`Language: ${options.language}`);
  }

  // Task-specific options
  if (taskType === 'image') {
    if (options.stylePreset) {
      rules.push(`Style: ${options.stylePreset}`);
    }
    if (options.aspectRatio) {
      rules.push(`Ratio: ${options.aspectRatio}`);
    }
  }

  if (taskType === 'video') {
    if (options.stylePreset) {
      rules.push(`Style: ${options.stylePreset}`);
    }
    if (options.aspectRatio) {
      rules.push(`Ratio: ${options.aspectRatio}`);
    }
    if (typeof options.durationSeconds === 'number') {
      rules.push(`Duration: ~${options.durationSeconds}s`);
    }
    if (typeof options.frameRate === 'number') {
      rules.push(`FPS: ${options.frameRate}`);
    }
    if (options.cameraMovement) {
      rules.push(`Camera: ${options.cameraMovement}`);
    }
    if (options.shotType) {
      rules.push(`Shot: ${options.shotType}`);
    }
  }

  if (taskType === 'coding' && options.includeTests) {
    rules.push("Include test examples");
  }

  if (taskType === 'research' && options.requireCitations) {
    rules.push("Include sources");
  }

  return rules.length > 0 ? `Requirements: ${rules.join(', ')}` : "";
}

/**
 * Validation for input quality
 */
export function validateInput(input: string, taskType: TaskType): { valid: boolean; error?: string } {
  const clean = input.trim();
  
  if (clean.length < 3) {
    return { valid: false, error: "Input too short" };
  }
  
  if (clean.length > 1000) {
    return { valid: false, error: "Input too long for Gemma 3B 1B" };
  }

  // Task-specific validation
  if (taskType === 'image' && clean.split(' ').length < 2) {
    return { valid: false, error: "Image prompts need subject and context" };
  }

  return { valid: true };
}

/**
 * Fallback system prompts if database is empty
 */
export function getFallbackSystemPrompt(mode: PromptMode): string {
  switch (mode) {
    case 'build':
      return "You create prompts from user descriptions.";
    default:
      return "You help with prompt engineering tasks.";
  }
}
