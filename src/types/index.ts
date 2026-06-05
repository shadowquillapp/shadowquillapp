export type TaskType =
	| "intent"
	| "engineering"
	| "visual"
	| "analysis"
	| "narrative"
	| "persuasion"
	| "motion";

export type Tone =
	| "neutral"
	| "friendly"
	| "formal"
	| "technical"
	| "persuasive";

export type Detail = "brief" | "normal" | "detailed";

export type Format = "plain" | "markdown" | "xml";

export interface GenerationOptions {
	tone?: Tone;
	detail?: Detail;
	format?: Format;
	language?: string;
	audience?: string;
	outputXMLSchema?: string;
	identity?: string;
	additionalContext?: string;
	styleGuidelines?: string;
}

export type PresetOptions = GenerationOptions;

export interface PresetLite {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: GenerationOptions;
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
