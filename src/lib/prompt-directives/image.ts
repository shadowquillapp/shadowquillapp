import type { GenerationOptions } from "@/types";

/**
 * Build image-specific directives
 */
export function buildImageDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	if (options.stylePreset) {
		directives.push(`Visual style: ${options.stylePreset}.`);

		// 2D style specific guidance
		const is2D = ["anime", "illustration", "cartoon", "watercolor"].some(
			(style) => options.stylePreset?.toLowerCase().includes(style),
		);

		if (is2D) {
			directives.push(
				"Use 2D art terminology: cel-shading, flat colors, bold line weight, stylized lighting.",
			);
		}
	}

	if (options.aspectRatio) {
		directives.push(`Aspect ratio: ${options.aspectRatio}.`);
	}

	// Default positive environment
	directives.push(
		"Default mood: If no specific mood is mentioned, default to bright, positive atmosphere.",
	);

	return directives;
}

