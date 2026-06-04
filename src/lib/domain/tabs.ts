import type {
	MessageItem,
	PromptPresetSummary,
	VersionGraph,
} from "@/app/workbench/_components/workbench/types";
import { getRaw, remove, setJSON } from "../local-storage";
import { isArrayOf, isRecord, isString, safeParse } from "../schema";
import { STORAGE_KEYS } from "../storage-keys";

export interface StoredTab {
	id: string;
	label: string;
	preset: PromptPresetSummary;
	projectId?: string | null;
	draft?: string;
	messages?: MessageItem[];
	versionGraph?: VersionGraph;
}

export interface StoredTabState {
	tabs: StoredTab[];
	activeTabId?: string | null;
}

function isPreset(v: unknown): v is PromptPresetSummary {
	return isRecord(v) && isString(v.name) && isString(v.taskType);
}

function isMessage(v: unknown): v is MessageItem {
	return (
		isRecord(v) &&
		isString(v.id) &&
		(v.role === "user" || v.role === "assistant") &&
		isString(v.content)
	);
}

function isVersionGraph(v: unknown): v is VersionGraph {
	return (
		isRecord(v) &&
		isRecord(v.nodes) &&
		isString(v.headId) &&
		isString(v.tailId) &&
		isString(v.activeId)
	);
}

function isStoredTab(v: unknown): v is StoredTab {
	return (
		isRecord(v) &&
		isString(v.id) &&
		isString(v.label) &&
		isPreset(v.preset) &&
		(v.projectId === undefined ||
			v.projectId === null ||
			isString(v.projectId)) &&
		(v.draft === undefined || isString(v.draft)) &&
		(v.messages === undefined || isArrayOf(v.messages, isMessage)) &&
		(v.versionGraph === undefined || isVersionGraph(v.versionGraph))
	);
}

function isStoredTabState(v: unknown): v is StoredTabState {
	return (
		isRecord(v) &&
		isArrayOf(v.tabs, isStoredTab) &&
		(v.activeTabId === undefined ||
			v.activeTabId === null ||
			isString(v.activeTabId))
	);
}

export function parseTabState(raw: string | null): StoredTabState {
	return safeParse(raw, isStoredTabState, { tabs: [], activeTabId: null });
}

export function readTabState(): StoredTabState {
	return parseTabState(getRaw(STORAGE_KEYS.WORKBENCH_TABS.key));
}

export function writeTabState(state: StoredTabState): void {
	setJSON(STORAGE_KEYS.WORKBENCH_TABS.key, state);
}

export function clearTabState(): void {
	remove(STORAGE_KEYS.WORKBENCH_TABS.key);
}
