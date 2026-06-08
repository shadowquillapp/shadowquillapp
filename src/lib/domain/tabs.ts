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

export function parseTabState(raw: string | null): StoredTabState {
	return safeParse(
		raw,
		(v): v is StoredTabState =>
			isRecord(v) &&
			isArrayOf(
				v.tabs,
				(tab): tab is StoredTab =>
					isRecord(tab) &&
					isString(tab.id) &&
					isString(tab.label) &&
					isRecord(tab.preset) &&
					isString(tab.preset.name) &&
					isString(tab.preset.taskType) &&
					(tab.projectId === undefined ||
						tab.projectId === null ||
						isString(tab.projectId)) &&
					(tab.draft === undefined || isString(tab.draft)) &&
					(tab.messages === undefined ||
						isArrayOf(
							tab.messages,
							(message): message is MessageItem =>
								isRecord(message) &&
								isString(message.id) &&
								(message.role === "user" || message.role === "assistant") &&
								isString(message.content),
						)) &&
					(tab.versionGraph === undefined ||
						(isRecord(tab.versionGraph) &&
							isRecord(tab.versionGraph.nodes) &&
							isString(tab.versionGraph.headId) &&
							isString(tab.versionGraph.tailId) &&
							isString(tab.versionGraph.activeId))),
			) &&
			(v.activeTabId === undefined ||
				v.activeTabId === null ||
				isString(v.activeTabId)),
		{ tabs: [], activeTabId: null },
	);
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
