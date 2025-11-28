import type { GenerationOptions } from "@/types";

/**
 * Build image-specific directives
 */
export function buildImageDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	// Style-specific guidance
	if (options.stylePreset) {
		const styleGuidance = getStyleGuidance(options.stylePreset);
		directives.push(styleGuidance);
	}

	// STRICT technical specifications - these MUST be used exactly as specified
	const specs: string[] = [];
	if (options.aspectRatio) {
		specs.push(`aspect ratio: ${options.aspectRatio}`);
	}
	if (options.targetResolution) {
		specs.push(`resolution: ${options.targetResolution}`);
	}
	if (specs.length > 0) {
		directives.push(
			`REQUIRED TECHNICAL SPECS (use these EXACTLY, do NOT invent or change): ${specs.join(", ")}.`,
		);
	}

	// Prompt structure guidance
	directives.push(
		"Keep descriptions focused and concise. Avoid verbose prose - use evocative keywords and short phrases.",
	);

	// Do not invent specifications
	directives.push(
		"Do NOT invent technical specifications. Only include the resolution and aspect ratio provided above. Never add specifications that weren't explicitly given.",
	);

	// Default positive environment
	directives.push(
		"Default mood: If no specific mood is mentioned, default to bright, positive atmosphere.",
	);

	return directives;
}

/**
 * Get style-specific guidance based on the selected style preset
 */
function getStyleGuidance(stylePreset: string): string {
	const style = stylePreset.toLowerCase();

	if (style === "anime") {
		return "ANIME STYLE: Use Japanese hand-drawn anime/manga art terminology - hand-drawn cel-shading, bold ink outlines, flat colors with subtle gradients, expressive eyes, dynamic poses, speed lines for motion, traditional animation aesthetic. Avoid photorealistic, 3D rendering, or AI-generated art terms.";
	}

	if (style === "illustration" || style === "cartoon") {
		return "ILLUSTRATION STYLE: Use 2D art terminology - clean linework, stylized proportions, flat or gradient colors, artistic composition. Avoid photorealistic terms.";
	}

	if (style === "watercolor") {
		return "WATERCOLOR STYLE: Use traditional art terminology - soft washes, bleeding edges, paper texture, muted palette, organic brush strokes, impressionistic details.";
	}

	if (style === "photorealistic") {
		return "PHOTOREALISTIC STYLE: Use photography terminology - natural lighting, depth of field, realistic textures, accurate shadows, high detail, atmospheric effects, camera lens characteristics.";
	}

	if (style === "3d") {
		return "3D RENDER STYLE: Use 3D rendering terminology - subsurface scattering, ambient occlusion, ray tracing, PBR materials, volumetric lighting, realistic reflections.";
	}

	return `Visual style: ${stylePreset}. Match terminology to this specific style.`;
}
