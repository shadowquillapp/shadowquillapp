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

export interface ProjectMessage {
	id: string;
	projectId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: Date;
}

export type MessageItem = Pick<ProjectMessage, "id" | "role" | "content">;

export interface VersionNodeMetadata {
	taskType?: string;
	options?: Record<string, unknown>;
	isRefinement?: boolean;
	refinedVersionId?: string;
}

export interface VersionNode {
	id: string;
	label: string;
	content: string;
	originalInput: string;
	outputMessageId: string | null;
	createdAt: number;
	prevId: string | null;
	nextId: string | null;
	metadata?: VersionNodeMetadata;
}

export interface VersionGraph {
	nodes: Record<string, VersionNode>;
	headId: string;
	tailId: string;
	activeId: string;
}

export interface PromptTabState {
	id: string;
	title: string;
	preset: PresetLite;
	projectId: string | null;
	messages: MessageItem[];
	versionGraph: VersionGraph;
	draft: string;
	createdAt: number;
	updatedAt: number;
	sending: boolean;
	error: string | null;
}

export interface PromptWorkspaceState {
	tabs: PromptTabState[];
	activeTabId: string | null;
}

declare global {
	interface Window {
		shadowquill?: {
			getEnvSafety?: () => Promise<unknown>;
			restartApp?: () => Promise<unknown>;
			getPlatform?: () => Promise<string>;
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
