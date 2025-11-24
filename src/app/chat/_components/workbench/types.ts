import type { PresetOptions, TaskType } from "@/app/studio/types";
import type { TestMessage } from "@/types";

export type MessageItem = Pick<TestMessage, "id" | "role" | "content">;

export interface PromptPresetSummary {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: PresetOptions;
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
	metadata?: {
		taskType?: string;
		options?: any;
	};
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
