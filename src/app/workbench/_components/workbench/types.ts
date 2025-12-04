import type { PresetOptions, TaskType, TestMessage } from "@/types";

export type MessageItem = Pick<TestMessage, "id" | "role" | "content">;

export interface PromptPresetSummary {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: PresetOptions;
}

export interface VersionNodeMetadata {
	taskType?: string;
	options?: Record<string, unknown>;
	isRefinement?: boolean; // True if this version is a refinement of a previous output
	refinedVersionId?: string; // ID of the version being refined (for refinements)
}

export interface VersionNode {
	id: string;
	label: string;
	content: string;
	originalInput: string; // Raw text user typed
	outputMessageId: string | null; // Links to assistant message
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
	preset: PromptPresetSummary;
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
