// ============================================
// Core Types - Single Source of Truth
// ============================================

export type TaskType =
	| "general"
	| "coding"
	| "image"
	| "research"
	| "writing"
	| "marketing"
	| "video";

// ============================================
// Basic Option Types
// ============================================

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

// ============================================
// Image Types
// ============================================

export type ImageStylePreset =
	| "photorealistic"
	| "illustration"
	| "3d"
	| "anime"
	| "watercolor";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3";

// ============================================
// Video Types
// ============================================

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

// ============================================
// Writing Types
// ============================================

export type WritingStyle =
	| "narrative"
	| "expository"
	| "technical"
	| "descriptive";

export type PointOfView = "first" | "second" | "third";

export type ReadingLevel = "basic" | "intermediate" | "expert";

// ============================================
// Marketing Types
// ============================================

export type MarketingChannel = "email" | "landing_page" | "social" | "ad";

export type CTAStyle = "soft" | "standard" | "strong";

// ============================================
// Unified Generation Options
// Used by both presets and prompt generation
// ============================================

export interface GenerationOptions {
	// Basic settings
	tone?: Tone;
	detail?: Detail;
	format?: Format;
	language?: string;
	temperature?: number;
	audience?: string;

	// Advanced settings
	useDelimiters?: boolean;
	includeVerification?: boolean;
	reasoningStyle?: ReasoningStyle;
	endOfPromptToken?: string;
	outputXMLSchema?: string;
	additionalContext?: string;
	examplesText?: string;
	styleGuidelines?: string;

	// Image settings
	stylePreset?: ImageStylePreset | VideoStylePreset;
	aspectRatio?: AspectRatio;

	// Video settings
	cameraMovement?: CameraMovement;
	shotType?: ShotType;
	durationSeconds?: number;
	frameRate?: FrameRate;
	includeStoryboard?: boolean;

	// Coding settings
	includeTests?: boolean;
	techStack?: string;
	projectContext?: string;
	codingConstraints?: string;

	// Research settings
	requireCitations?: boolean;

	// Writing settings
	writingStyle?: WritingStyle;
	pointOfView?: PointOfView;
	readingLevel?: ReadingLevel;
	targetWordCount?: number;
	includeHeadings?: boolean;

	// Marketing settings
	marketingChannel?: MarketingChannel;
	ctaStyle?: CTAStyle;
	valueProps?: string;
	complianceNotes?: string;
}

// Alias for backward compatibility
export type PresetOptions = GenerationOptions;

// ============================================
// Preset Example Types
// ============================================

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

// ============================================
// Preset Types
// ============================================

export interface PresetLite {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: GenerationOptions;
	/** AI-generated example inputs and outputs */
	generatedExamples?: [PresetExample, PresetExample];
}

/**
 * A snapshot of a preset's options at a specific point in time
 */
export interface PresetVersion {
	/** Auto-incrementing version number */
	version: number;
	/** When this version was created */
	timestamp: number;
	/** The task type for this version */
	taskType: TaskType;
	/** The options snapshot for this version */
	options: GenerationOptions;
	/** Optional description of changes */
	changelog?: string;
}

/**
 * Extended preset with version history support
 */
export interface VersionedPreset extends PresetLite {
	/** Array of historical versions (most recent first) */
	versions?: PresetVersion[];
	/** Current active version number */
	currentVersion?: number;
	/** When the preset was first created */
	createdAt?: number;
	/** When the preset was last modified */
	updatedAt?: number;
}

export interface ValidationError {
	field: string;
	message: string;
}

// ============================================
// Database / Storage Types
// ============================================

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
		};
	}
}
