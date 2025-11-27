export type TaskType =
	| "general"
	| "coding"
	| "image"
	| "research"
	| "writing"
	| "marketing"
	| "video";

export interface GenerationOptions {
	tone?:
		| "neutral"
		| "friendly"
		| "formal"
		| "technical"
		| "persuasive"
		| undefined;
	detail?: "brief" | "normal" | "detailed" | undefined;
	format?: "plain" | "markdown" | "xml" | undefined;
	audience?: string | undefined;
	language?: string | undefined;
	styleGuidelines?: string | undefined;
	temperature?: number | undefined;
	useDelimiters?: boolean | undefined;
	includeVerification?: boolean | undefined;
	reasoningStyle?:
		| "none"
		| "cot"
		| "plan_then_solve"
		| "tree_of_thought"
		| undefined;
	endOfPromptToken?: string | undefined;
	outputXMLSchema?: string | undefined;
	additionalContext?: string | undefined;
	examplesText?: string | undefined;
	stylePreset?:
		| "photorealistic"
		| "illustration"
		| "3d"
		| "anime"
		| "watercolor"
		| "cinematic"
		| "documentary"
		| "animation"
		| "timelapse"
		| "vlog"
		| "commercial"
		| undefined;
	aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | undefined;
	includeTests?: boolean | undefined;
	requireCitations?: boolean | undefined;
	cameraMovement?:
		| "static"
		| "pan"
		| "tilt"
		| "dolly"
		| "zoom"
		| "handheld"
		| "tracking"
		| undefined;
	shotType?:
		| "wide"
		| "medium"
		| "close_up"
		| "over_the_shoulder"
		| "first_person"
		| undefined;
	durationSeconds?: number | undefined;
	frameRate?: 24 | 30 | 60 | undefined;
	includeStoryboard?: boolean | undefined;
	// Writing
	writingStyle?:
		| "narrative"
		| "expository"
		| "technical"
		| "descriptive"
		| undefined;
	pointOfView?: "first" | "second" | "third" | undefined;
	readingLevel?: "basic" | "intermediate" | "expert" | undefined;
	targetWordCount?: number | undefined;
	includeHeadings?: boolean | undefined;
	// Marketing
	marketingChannel?: "email" | "landing_page" | "social" | "ad" | undefined;
	ctaStyle?: "soft" | "standard" | "strong" | undefined;
	valueProps?: string | undefined;
	complianceNotes?: string | undefined;
}

export interface GoogleAIChatInput {
	input: string;
	taskType: TaskType;
	options?: GenerationOptions;
}
