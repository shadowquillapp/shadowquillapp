import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { clearTabState, readTabState, writeTabState } from "@/lib/domain/tabs";
import { isFactoryResetInProgress } from "@/lib/local-storage";
import type { MessageItem, PromptPresetSummary, VersionGraph } from "./types";
import { createVersionGraph } from "./version-graph";

const MAX_TABS = 8;

export interface Tab {
	id: string;
	label: string;
	preset: PromptPresetSummary;
	projectId: string | null;
	draft: string;
	messages: MessageItem[];
	versionGraph: VersionGraph;
	sending: boolean;
	error: string | null;
	isDirty: boolean;
}

interface TabManagerState {
	tabs: Tab[];
	activeTabId: string | null;
}

type TabAction =
	| {
			type: "CREATE_TAB";
			payload: { preset: PromptPresetSummary; tabId: string };
	  }
	| { type: "CLOSE_TAB"; payload: { tabId: string } }
	| { type: "SWITCH_TAB"; payload: { tabId: string } }
	| { type: "UPDATE_TAB_LABEL"; payload: { tabId: string; label: string } }
	| { type: "UPDATE_TAB_DRAFT"; payload: { tabId: string; draft: string } }
	| {
			type: "SET_TAB_MESSAGES";
			payload: { tabId: string; messages: MessageItem[] };
	  }
	| {
			type: "PUSH_TAB_MESSAGE";
			payload: { tabId: string; message: MessageItem };
	  }
	| {
			type: "UPDATE_TAB_MESSAGE";
			payload: {
				tabId: string;
				messageId: string;
				patch: Partial<MessageItem>;
			};
	  }
	| { type: "SET_TAB_SENDING"; payload: { tabId: string; sending: boolean } }
	| { type: "SET_TAB_ERROR"; payload: { tabId: string; error: string | null } }
	| {
			type: "ATTACH_TAB_PROJECT";
			payload: { tabId: string; projectId: string | null };
	  }
	| {
			type: "SET_TAB_VERSION_GRAPH";
			payload: { tabId: string; versionGraph: VersionGraph };
	  }
	| {
			type: "SET_TAB_PRESET";
			payload: { tabId: string; preset: PromptPresetSummary };
	  }
	| { type: "MARK_TAB_DIRTY"; payload: { tabId: string; isDirty: boolean } }
	| {
			type: "RESTORE_TABS";
			payload: { tabs: Tab[]; activeTabId: string | null };
	  }
	| { type: "REORDER_TABS"; payload: { fromIndex: number; toIndex: number } };

const initialState: TabManagerState = {
	tabs: [],
	activeTabId: null,
};

function generateTabLabel(
	preset: PromptPresetSummary,
	existingTabs: Tab[],
): string {
	const baseName = preset.name;
	const existingLabels = existingTabs.map((t) => t.label);

	if (!existingLabels.includes(baseName)) {
		return baseName;
	}

	let counter = 2;
	while (existingLabels.includes(`${baseName} ${counter}`)) {
		counter++;
	}
	return `${baseName} ${counter}`;
}

function patchTab(
	state: TabManagerState,
	tabId: string,
	update: (tab: Tab) => Tab,
): TabManagerState {
	return {
		...state,
		tabs: state.tabs.map((tab) => (tab.id === tabId ? update(tab) : tab)),
	};
}

const reducer = (
	state: TabManagerState,
	action: TabAction,
): TabManagerState => {
	switch (action.type) {
		case "CREATE_TAB": {
			if (state.tabs.length >= MAX_TABS) return state;
			const newTab: Tab = {
				id: action.payload.tabId,
				label: generateTabLabel(action.payload.preset, state.tabs),
				preset: action.payload.preset,
				projectId: null,
				draft: "",
				messages: [],
				versionGraph: createVersionGraph("", "Start"),
				sending: false,
				error: null,
				isDirty: false,
			};
			return {
				tabs: [...state.tabs, newTab],
				activeTabId: newTab.id,
			};
		}

		case "CLOSE_TAB": {
			const { tabId } = action.payload;
			const newTabs = state.tabs.filter((t) => t.id !== tabId);

			if (newTabs.length === 0) {
				return { tabs: [], activeTabId: null };
			}

			let newActiveId = state.activeTabId;
			if (state.activeTabId === tabId) {
				const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
				newActiveId =
					newTabs[closedIndex]?.id ??
					newTabs[closedIndex - 1]?.id ??
					newTabs[0]?.id ??
					null;
			}

			return {
				tabs: newTabs,
				activeTabId: newActiveId,
			};
		}

		case "SWITCH_TAB": {
			const { tabId } = action.payload;
			if (!state.tabs.find((t) => t.id === tabId)) return state;
			return { ...state, activeTabId: tabId };
		}

		case "UPDATE_TAB_LABEL":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				label: action.payload.label,
			}));

		case "UPDATE_TAB_DRAFT":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				draft: action.payload.draft,
				isDirty: true,
			}));

		case "SET_TAB_MESSAGES":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				messages: action.payload.messages,
			}));

		case "PUSH_TAB_MESSAGE":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				messages: [...tab.messages, action.payload.message],
			}));

		case "UPDATE_TAB_MESSAGE": {
			const { tabId, messageId, patch } = action.payload;
			return patchTab(state, tabId, (tab) => ({
				...tab,
				messages: tab.messages.map((m) =>
					m.id === messageId ? { ...m, ...patch } : m,
				),
			}));
		}

		case "SET_TAB_SENDING":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				sending: action.payload.sending,
			}));

		case "SET_TAB_ERROR":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				error: action.payload.error,
			}));

		case "ATTACH_TAB_PROJECT":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				projectId: action.payload.projectId,
				isDirty: false,
			}));

		case "SET_TAB_VERSION_GRAPH":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				versionGraph: action.payload.versionGraph,
			}));

		case "SET_TAB_PRESET":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				preset: action.payload.preset,
			}));

		case "MARK_TAB_DIRTY":
			return patchTab(state, action.payload.tabId, (tab) => ({
				...tab,
				isDirty: action.payload.isDirty,
			}));

		case "RESTORE_TABS":
			return {
				tabs: action.payload.tabs,
				activeTabId: action.payload.activeTabId,
			};

		case "REORDER_TABS": {
			const { fromIndex, toIndex } = action.payload;
			if (
				fromIndex === toIndex ||
				fromIndex < 0 ||
				toIndex < 0 ||
				fromIndex >= state.tabs.length ||
				toIndex >= state.tabs.length
			) {
				return state;
			}

			const newTabs = [...state.tabs];
			const movedTab = newTabs.splice(fromIndex, 1)[0];
			if (!movedTab) return state;
			newTabs.splice(toIndex, 0, movedTab);

			return {
				...state,
				tabs: newTabs,
			};
		}

		default:
			return state;
	}
};

function persistTabs(state: TabManagerState): void {
	writeTabState({
		tabs: state.tabs.map((tab) => ({
			id: tab.id,
			label: tab.label,
			preset: tab.preset,
			projectId: tab.projectId,
			draft: tab.draft,
			messages: tab.messages,
			versionGraph: tab.versionGraph,
		})),
		activeTabId: state.activeTabId,
	});
}

export function useTabManager() {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [isInitialized, setIsInitialized] = useState(false);
	const stateRef = useRef(state);

	const activeTab = state.tabs.find((t) => t.id === state.activeTabId) ?? null;
	const activeTabId = activeTab?.id ?? null;

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		if (!isInitialized) return;
		if (isFactoryResetInProgress()) return;
		const timer = window.setTimeout(() => {
			try {
				persistTabs(state);
			} catch (error) {
				console.error("Failed to persist tabs:", error);
			}
		}, 250);
		return () => window.clearTimeout(timer);
	}, [state, isInitialized]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (!isInitialized) return;
			if (isFactoryResetInProgress()) return;
			try {
				persistTabs(stateRef.current);
			} catch (error) {
				console.error("Failed to persist tabs on unload:", error);
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [isInitialized]);

	useEffect(() => {
		try {
			const parsed = readTabState();
			if (parsed.tabs.length > 0) {
				const restoredTabs: Tab[] = parsed.tabs.map((tab) => ({
					id: tab.id,
					label: tab.label,
					preset: tab.preset,
					projectId: tab.projectId ?? null,
					draft: tab.draft ?? "",
					messages: tab.messages ?? [],
					versionGraph: tab.versionGraph ?? createVersionGraph("", "Start"),
					sending: false,
					error: null,
					isDirty: false,
				}));

				if (restoredTabs.length > 0) {
					const validActiveTabId =
						parsed.activeTabId &&
						restoredTabs.some((t) => t.id === parsed.activeTabId)
							? parsed.activeTabId
							: restoredTabs[0]?.id || null;

					dispatch({
						type: "RESTORE_TABS",
						payload: {
							tabs: restoredTabs,
							activeTabId: validActiveTabId,
						},
					});
				}
			}
		} catch (error) {
			console.error("Failed to restore tabs:", error);
			try {
				clearTabState();
			} catch {}
		} finally {
			setIsInitialized(true);
		}
	}, []);

	const createTab = useCallback((preset: PromptPresetSummary): string => {
		const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		dispatch({ type: "CREATE_TAB", payload: { preset, tabId } });
		return tabId;
	}, []);

	const closeTab = useCallback(
		(tabId: string) => dispatch({ type: "CLOSE_TAB", payload: { tabId } }),
		[],
	);

	const switchTab = useCallback(
		(tabId: string) => dispatch({ type: "SWITCH_TAB", payload: { tabId } }),
		[],
	);

	const updateTabLabel = useCallback(
		(tabId: string, label: string) =>
			dispatch({ type: "UPDATE_TAB_LABEL", payload: { tabId, label } }),
		[],
	);

	const reorderTabs = useCallback(
		(fromIndex: number, toIndex: number) =>
			dispatch({ type: "REORDER_TABS", payload: { fromIndex, toIndex } }),
		[],
	);

	const updateDraft = useCallback(
		(draft: string) => {
			if (!activeTabId) return;
			dispatch({
				type: "UPDATE_TAB_DRAFT",
				payload: { tabId: activeTabId, draft },
			});
		},
		[activeTabId],
	);

	const setMessages = useCallback(
		(messages: MessageItem[]) => {
			if (!activeTabId) return;
			dispatch({
				type: "SET_TAB_MESSAGES",
				payload: { tabId: activeTabId, messages },
			});
		},
		[activeTabId],
	);

	const pushMessage = useCallback(
		(message: MessageItem) => {
			if (!activeTabId) return;
			dispatch({
				type: "PUSH_TAB_MESSAGE",
				payload: { tabId: activeTabId, message },
			});
		},
		[activeTabId],
	);

	const updateMessage = useCallback(
		(messageId: string, patch: Partial<MessageItem>) => {
			if (!activeTabId) return;
			dispatch({
				type: "UPDATE_TAB_MESSAGE",
				payload: { tabId: activeTabId, messageId, patch },
			});
		},
		[activeTabId],
	);

	const setSending = useCallback(
		(sending: boolean) => {
			if (!activeTabId) return;
			dispatch({
				type: "SET_TAB_SENDING",
				payload: { tabId: activeTabId, sending },
			});
		},
		[activeTabId],
	);

	const setError = useCallback(
		(error: string | null) => {
			if (!activeTabId) return;
			dispatch({
				type: "SET_TAB_ERROR",
				payload: { tabId: activeTabId, error },
			});
		},
		[activeTabId],
	);

	const attachProject = useCallback(
		(projectId: string | null) => {
			if (!activeTabId) return;
			dispatch({
				type: "ATTACH_TAB_PROJECT",
				payload: { tabId: activeTabId, projectId },
			});
		},
		[activeTabId],
	);

	const setVersionGraph = useCallback(
		(versionGraph: VersionGraph) => {
			if (!activeTabId) return;
			dispatch({
				type: "SET_TAB_VERSION_GRAPH",
				payload: { tabId: activeTabId, versionGraph },
			});
		},
		[activeTabId],
	);

	const setPreset = useCallback(
		(preset: PromptPresetSummary) => {
			if (!activeTabId) return;
			dispatch({
				type: "SET_TAB_PRESET",
				payload: { tabId: activeTabId, preset },
			});
		},
		[activeTabId],
	);

	const markDirty = useCallback(
		(isDirty: boolean) => {
			if (!activeTabId) return;
			dispatch({
				type: "MARK_TAB_DIRTY",
				payload: { tabId: activeTabId, isDirty },
			});
		},
		[activeTabId],
	);

	const findTabByProjectId = useCallback(
		(projectId: string): Tab | null =>
			state.tabs.find((t) => t.projectId === projectId) ?? null,
		[state.tabs],
	);

	const updateDraftForTab = useCallback(
		(tabId: string, draft: string) =>
			dispatch({ type: "UPDATE_TAB_DRAFT", payload: { tabId, draft } }),
		[],
	);

	const setMessagesForTab = useCallback(
		(tabId: string, messages: MessageItem[]) =>
			dispatch({ type: "SET_TAB_MESSAGES", payload: { tabId, messages } }),
		[],
	);

	const pushMessageForTab = useCallback(
		(tabId: string, message: MessageItem) =>
			dispatch({ type: "PUSH_TAB_MESSAGE", payload: { tabId, message } }),
		[],
	);

	const updateMessageForTab = useCallback(
		(tabId: string, messageId: string, patch: Partial<MessageItem>) =>
			dispatch({
				type: "UPDATE_TAB_MESSAGE",
				payload: { tabId, messageId, patch },
			}),
		[],
	);

	const setSendingForTab = useCallback(
		(tabId: string, sending: boolean) =>
			dispatch({ type: "SET_TAB_SENDING", payload: { tabId, sending } }),
		[],
	);

	const setVersionGraphForTab = useCallback(
		(tabId: string, versionGraph: VersionGraph) =>
			dispatch({
				type: "SET_TAB_VERSION_GRAPH",
				payload: { tabId, versionGraph },
			}),
		[],
	);

	const attachProjectForTab = useCallback(
		(tabId: string, projectId: string | null) =>
			dispatch({ type: "ATTACH_TAB_PROJECT", payload: { tabId, projectId } }),
		[],
	);

	const setErrorForTab = useCallback(
		(tabId: string, error: string | null) =>
			dispatch({ type: "SET_TAB_ERROR", payload: { tabId, error } }),
		[],
	);

	const setPresetForTab = useCallback(
		(tabId: string, preset: PromptPresetSummary) =>
			dispatch({ type: "SET_TAB_PRESET", payload: { tabId, preset } }),
		[],
	);

	const markDirtyForTab = useCallback(
		(tabId: string, isDirty: boolean) =>
			dispatch({ type: "MARK_TAB_DIRTY", payload: { tabId, isDirty } }),
		[],
	);

	const getTabs = useCallback(() => stateRef.current.tabs, []);

	return {
		tabs: state.tabs,
		activeTabId: state.activeTabId,
		activeTab,
		maxTabs: MAX_TABS,
		canCreateTab: state.tabs.length < MAX_TABS,

		createTab,
		closeTab,
		switchTab,
		updateTabLabel,
		reorderTabs,
		findTabByProjectId,

		updateDraft,
		setMessages,
		pushMessage,
		updateMessage,
		setSending,
		setError,
		attachProject,
		setVersionGraph,
		setPreset,
		markDirty,

		updateDraftForTab,
		setMessagesForTab,
		pushMessageForTab,
		updateMessageForTab,
		setSendingForTab,
		setVersionGraphForTab,
		attachProjectForTab,
		setErrorForTab,
		setPresetForTab,
		markDirtyForTab,
		getTabs,
	};
}
