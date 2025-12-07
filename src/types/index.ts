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

export type ReasoningStyle =
	| "none"
	| "cot"
	| "plan_then_solve"
	| "tree_of_thought";

export type ImageStylePreset =
	| "photorealistic"
	| "illustration"
	| "3d"
	| "anime"
	| "watercolor";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3";

export type TargetResolution = "720p" | "1080p" | "2K" | "4K";

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

export type WritingStyle =
	| "narrative"
	| "expository"
	| "technical"
	| "descriptive";

export type PointOfView = "first" | "second" | "third";

export type ReadingLevel = "basic" | "intermediate" | "expert";

export type MarketingChannel = "email" | "landing_page" | "social" | "ad";

export type CTAStyle = "soft" | "standard" | "strong";

export interface GenerationOptions {
	tone?: Tone;
	detail?: Detail;
	format?: Format;
	language?: string;
	temperature?: number;
	audience?: string;

	useDelimiters?: boolean;
	includeVerification?: boolean;
	reasoningStyle?: ReasoningStyle;
	endOfPromptToken?: string;
	outputXMLSchema?: string;
	identity?: string;
	additionalContext?: string;
	examplesText?: string;
	styleGuidelines?: string;

	stylePreset?: ImageStylePreset | VideoStylePreset;
	aspectRatio?: AspectRatio;
	targetResolution?: TargetResolution;

	cameraMovement?: CameraMovement;
	shotType?: ShotType;
	durationSeconds?: number;
	frameRate?: FrameRate;
	includeStoryboard?: boolean;

	includeTests?: boolean;
	techStack?: string;
	projectContext?: string;
	codingConstraints?: string;

	requireCitations?: boolean;

	writingStyle?: WritingStyle;
	pointOfView?: PointOfView;
	readingLevel?: ReadingLevel;
	targetWordCount?: number;
	includeHeadings?: boolean;

	marketingChannel?: MarketingChannel;
	ctaStyle?: CTAStyle;
	valueProps?: string;
	complianceNotes?: string;
}

export type PresetOptions = GenerationOptions;

/**
 * A generated example for a preset, showing input and output
 */
export interface PresetExample {
	/** The example input/prompt */
	input: string;
	/** The generated output for this input */
	output: string;
	/** When this example was generated */
	generatedAt: number;
}

export interface PresetLite {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: GenerationOptions;
	/** AI-generated example inputs and outputs */
	generatedExamples?: [PresetExample, PresetExample];
}

export interface PresetVersion {
	version: number;
	timestamp: number;
	taskType: TaskType;
	options: GenerationOptions;
	changelog?: string;
}

export interface VersionedPreset extends PresetLite {
	versions?: PresetVersion[];
	currentVersion?: number;
	createdAt?: number;
	updatedAt?: number;
}

export interface ValidationError {
	field: string;
	message: string;
}

export interface AppSetting {
	id: string;
	key: string;
	value: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PromptPreset {
	id: string;
	userId: string;
	name: string;
	taskType: string;
	options: GenerationOptions;
	createdAt: Date;
	updatedAt: Date;
}

export interface PromptProject {
	id: string;
	userId: string;
	title: string | null;
	presetId?: string;
	createdAt: Date;
	updatedAt: Date;
	versionGraph?: unknown;
}

export interface TestMessage {
	id: string;
	projectId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: Date;
}

export interface SystemSpecs {
	cpu: string;
	ram: number;
	gpu: string;
}

// ============================================
// Backward Compatibility Aliases
// ============================================

// For studio/types.ts compatibility
export type ImageAspectRatio = AspectRatio;

// ============================================
// Global Window Extensions
// ============================================

declare global {
	interface Window {
		shadowquill?: {
			getPlatform?: () => Promise<string>;
			getSystemSpecs?: () => Promise<SystemSpecs>;
			window?: {
				minimize?: () => Promise<void>;
				maximizeToggle?: () => Promise<void>;
				close?: () => Promise<void>;
			};
			checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
			openOllama?: () => Promise<{ ok: boolean; error?: string }>;
			getDataPaths?: () => Promise<unknown>;
			factoryReset?: () => Promise<unknown>;
			restartApp?: () => Promise<unknown>;
			find?: {
				findInPage: (
					text: string,
					options?: {
						forward?: boolean;
						findNext?: boolean;
						matchCase?: boolean;
					},
				) => Promise<{ ok: boolean; requestId?: number }>;
				stopFindInPage: (action?: string) => Promise<{ ok: boolean }>;
				onShow: (callback: () => void) => () => void;
				onNext: (callback: () => void) => () => void;
				onPrevious: (callback: () => void) => () => void;
			};
		};
	}
}
