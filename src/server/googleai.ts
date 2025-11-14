// Types only - local Ollama only
import { buildStylePresetPhrase } from '@/server/image-style-presets';
export type TaskType = "general" | "coding" | "image" | "research" | "writing" | "marketing" | "video";

export interface GenerationOptions {
  tone?: "neutral" | "friendly" | "formal" | "technical" | "persuasive" | undefined;
  detail?: "brief" | "normal" | "detailed" | undefined;
  format?: "plain" | "markdown" | "json" | undefined;
  audience?: string | undefined;
  language?: string | undefined;
  styleGuidelines?: string | undefined;
  temperature?: number | undefined;
  // Type-specific
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

export interface GoogleAIChatInput {
  input: string;
  taskType: TaskType;
  options?: GenerationOptions;
}

// All functions removed - local Ollama only