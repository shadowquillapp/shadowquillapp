export type TaskType =
	| "general"
	| "coding"
	| "image"
	| "research"
	| "writing"
	| "marketing"
	| "video";

export type Tone =
	| "neutral"
	| "friendly"
	| "formal"
	| "technical"
	| "persuasive";

export type Detail = "brief" | "normal" | "detailed";

export type Format = "plain" | "markdown" | "xml";

export type ImageStylePreset =
	| "photorealistic"
	| "illustration"
	| "3d"
	| "anime"
	| "watercolor";

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3";

export type VideoStylePreset =
	| "cinematic"
	| "documentary"
	| "animation"
	| "timelapse"
	| "vlog"
	| "commercial"
	| "anime";

export type CameraMovement =
	| "static"
	| "pan"
	| "tilt"
	| "dolly"
	| "zoom"
	| "handheld"
	| "tracking";

export type ShotType =
	| "wide"
	| "medium"
	| "close_up"
	| "over_the_shoulder"
	| "first_person";

export type FrameRate = 24 | 30 | 60;

export type ReasoningStyle =
	| "none"
	| "cot"
	| "plan_then_solve"
	| "tree_of_thought";

export type PointOfView = "first" | "second" | "third";
export type ReadingLevel = "basic" | "intermediate" | "expert";
export type WritingStyle =
	| "narrative"
	| "expository"
	| "technical"
	| "descriptive";
export type MarketingChannel = "email" | "landing_page" | "social" | "ad";
export type CTAStyle = "soft" | "standard" | "strong";

export interface PresetOptions {
	// Basic settings
	tone?: Tone;
	detail?: Detail;
	format?: Format;
	language?: string;
	temperature?: number;

	// Advanced settings
	useDelimiters?: boolean;
	includeVerification?: boolean;
	reasoningStyle?: ReasoningStyle;
	endOfPromptToken?: string;
	outputXMLSchema?: string;
	additionalContext?: string;
	examplesText?: string;

	// Type-specific settings
	// Image
	stylePreset?: ImageStylePreset | VideoStylePreset;
	aspectRatio?: ImageAspectRatio;

	// Video
	cameraMovement?: CameraMovement;
	shotType?: ShotType;
	durationSeconds?: number;
	frameRate?: FrameRate;

	// Coding
	includeTests?: boolean;
	techStack?: string;
	projectContext?: string;
	codingConstraints?: string;

	// Research
	requireCitations?: boolean;

	// Writing
	writingStyle?: WritingStyle;
	pointOfView?: PointOfView;
	readingLevel?: ReadingLevel;
	targetWordCount?: number;
	includeHeadings?: boolean;

	// Marketing
	marketingChannel?: MarketingChannel;
	ctaStyle?: CTAStyle;
	valueProps?: string;
	complianceNotes?: string;
}

export interface PresetLite {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: PresetOptions;
}

export interface ValidationError {
	field: string;
	message: string;
}
