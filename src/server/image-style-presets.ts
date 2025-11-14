// Centralized descriptive expansions for image style presets.
// These get woven into generated image prompts (plain format) to enrich output

export type ImageStylePreset = "photorealistic" | "illustration" | "3d" | "anime" | "watercolor";

interface StyleDescriptor {
  label: string;
  baseTags: string[];      // core stylistic tokens
  lighting?: string[];     // optional lighting adjectives
  renderingHints?: string[]; // medium / rendering engine style hints
  colorHints?: string[];   // palette suggestions
}

export const IMAGE_STYLE_PRESETS: Record<ImageStylePreset, StyleDescriptor> = {
  photorealistic: {
    label: "Photorealistic",
    baseTags: ["photorealistic", "sharp focus"],
    lighting: ["natural light"],
  },
  illustration: {
    label: "Illustration",
    baseTags: ["clean digital illustration"],
    lighting: ["soft light"],
  },
  "3d": {
    label: "3D Render",
    baseTags: ["3d render", "physically based materials"],
    lighting: ["studio lighting"],
  },
  anime: {
    label: "Anime",
    baseTags: ["studio anime", "clean cel shading"],
    lighting: ["soft rim lighting"],
  },
  watercolor: {
    label: "Watercolor",
    baseTags: ["watercolor painting"],
    lighting: ["ambient daylight"],
  },
};

export function buildStylePresetPhrase(preset: ImageStylePreset): string {
  const p = IMAGE_STYLE_PRESETS[preset];
  const parts = [
    ...p.baseTags,
    ...(p.lighting || []),
    ...(p.renderingHints || []),
    ...(p.colorHints || []),
  ];
  return Array.from(new Set(parts)).join(", ");
}
