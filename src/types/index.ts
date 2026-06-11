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

export type Detail = "normal" | "detailed";

export type Format = "plain" | "markdown";

export interface GenerationOptions {
	tone?: Tone;
	detail?: Detail;
	format?: Format;
	language?: string;
	audience?: string;
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

declare global {
	interface Window {
		shadowquill?: {
			getEnvSafety?: () => Promise<unknown>;
			restartApp?: () => Promise<unknown>;
			getPlatform?: () => Promise<string>;
			getSystemSpecs?: () => Promise<SystemSpecs>;
			checkForUpdates?: () => Promise<{
				success: boolean;
				currentVersion?: string;
				latestVersion?: string;
				updateAvailable?: boolean;
				releaseUrl?: string;
				releaseNotes?: string;
				publishedAt?: string;
				error?: string;
			}>;
			openExternalUrl?: (url: string) => Promise<unknown>;
			window?: {
				minimize?: () => Promise<void>;
				maximizeToggle?: () => Promise<void>;
				close?: () => Promise<void>;
				getSize?: () => Promise<{
					ok: boolean;
					windowSize?: [number, number];
					contentSize?: [number, number];
					isMaximized?: boolean;
					isFullScreen?: boolean;
				}>;
			};
			view?: {
				getZoomFactor?: () => Promise<number>;
				setZoomFactor?: (factor: number) => Promise<void>;
				resetZoom?: () => Promise<void>;
				onZoomChanged?: (callback: (factor: number) => void) => () => void;
			};
			storage?: {
				getItem: (key: string) => Promise<string | null>;
				setItem: (key: string, value: string) => Promise<boolean>;
				removeItem: (key: string) => Promise<boolean>;
				clear: () => Promise<boolean>;
				getAll: () => Promise<Record<string, string>>;
			};
			checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
			openOllama?: () => Promise<{ ok: boolean; error?: string }>;
			getDataPaths?: () => Promise<unknown>;
			factoryReset?: () => Promise<{ ok: boolean; error?: string }>;
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
