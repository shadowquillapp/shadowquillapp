import type { GenerationOptions } from "@/types";

/**
 * Build video-specific directives
 */
export function buildVideoDirectives(options: GenerationOptions): string[] {
	const directives: string[] = [];

	if (options.stylePreset) {
		directives.push(`Visual style: ${options.stylePreset}.`);
	}

	if (options.aspectRatio) {
		directives.push(`Aspect ratio: ${options.aspectRatio}.`);
	}

	if (typeof options.durationSeconds === "number") {
		directives.push(`Duration: ~${options.durationSeconds} seconds.`);
	}

	if (typeof options.frameRate === "number") {
		directives.push(`Frame rate: ${options.frameRate} fps.`);
	}

	// Camera and shot handling based on style
	const is2D =
		options.stylePreset &&
		["anime", "animation", "cartoon", "hand-drawn"].some((style) =>
			options.stylePreset?.toLowerCase().includes(style),
		);

	if (is2D) {
		if (options.cameraMovement) {
			const animationTerms: Record<string, string> = {
				static: "Static framing with action contained in frame.",
				pan: "Fast panning with dramatic perspective changes.",
				zoom: "Snap zooms for emphasis.",
				tracking: "Perspective shifts with action lines.",
				dolly: "Dynamic perspective movement.",
				tilt: "Dramatic angle shifts.",
				handheld: "Energetic, loose framing.",
			};
			directives.push(
				animationTerms[options.cameraMovement] ??
					`${options.cameraMovement} motion with animation techniques.`,
			);
		}
		directives.push(
			"Use animation terminology (cuts, pans, speed lines) not cinematography terms.",
		);
	} else {
		if (options.cameraMovement) {
			directives.push(`Camera: ${options.cameraMovement} movement.`);
		}
		directives.push("Use cinematic terminology for camera and lighting.");
	}

	if (options.shotType) {
		directives.push(`Shot type: ${options.shotType}.`);
	}

	// Storyboard
	if (options.includeStoryboard) {
		const duration = options.durationSeconds || 5;
		const frames = duration >= 10 ? Math.ceil(duration / 3) : Math.ceil(duration / 2);
		directives.push(
			`Include storyboard: ${frames} frames with timestamp, scene description, camera angle, and key action.`,
		);
	}

	// Default positive environment
	directives.push(
		"Default mood: If no specific mood is mentioned, default to bright, positive atmosphere.",
	);

	return directives;
}

