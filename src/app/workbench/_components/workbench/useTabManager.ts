import { useCallback, useEffect, useReducer, useRef } from "react";
import { createVersionGraph } from "./version-graph";
import { isFactoryResetInProgress } from "@/lib/local-storage";
import type {
	MessageItem,
	PromptPresetSummary,
	VersionGraph,
} from "./types";

const MAX_TABS = 8;
const STORAGE_KEY = "workbench-tabs-v1";

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
	| { type: "CREATE_TAB"; payload: { preset: PromptPresetSummary; tabId: string } }
	| { type: "CLOSE_TAB"; payload: { tabId: string } }
	| { type: "SWITCH_TAB"; payload: { tabId: string } }
	| { type: "UPDATE_TAB_LABEL"; payload: { tabId: string; label: string } }
	| { type: "UPDATE_TAB_DRAFT"; payload: { tabId: string; draft: string } }
	| { type: "SET_TAB_MESSAGES"; payload: { tabId: string; messages: MessageItem[] } }
	| { type: "PUSH_TAB_MESSAGE"; payload: { tabId: string; message: MessageItem } }
	| { type: "UPDATE_TAB_MESSAGE"; payload: { tabId: string; messageId: string; patch: Partial<MessageItem> } }
	| { type: "SET_TAB_SENDING"; payload: { tabId: string; sending: boolean } }
	| { type: "SET_TAB_ERROR"; payload: { tabId: string; error: string | null } }
	| { type: "ATTACH_TAB_PROJECT"; payload: { tabId: string; projectId: string | null } }
	| { type: "SET_TAB_VERSION_GRAPH"; payload: { tabId: string; versionGraph: VersionGraph } }
	| { type: "SET_TAB_PRESET"; payload: { tabId: string; preset: PromptPresetSummary } }
	| { type: "MARK_TAB_DIRTY"; payload: { tabId: string; isDirty: boolean } }
	| { type: "RESTORE_TABS"; payload: { tabs: Tab[]; activeTabId: string | null } }
	| { type: "REORDER_TABS"; payload: { fromIndex: number; toIndex: number } };

const initialState: TabManagerState = {
	tabs: [],
	activeTabId: null,
};

function generateTabLabel(preset: PromptPresetSummary, existingTabs: Tab[]): string {
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

function createNewTab(preset: PromptPresetSummary, existingTabs: Tab[], tabId: string): Tab {
	return {
		id: tabId,
		label: generateTabLabel(preset, existingTabs),
		preset,
		projectId: null,
		draft: "",
		messages: [],
		versionGraph: createVersionGraph("", "Start"),
		sending: false,
		error: null,
		isDirty: false,
	};
}

const reducer = (state: TabManagerState, action: TabAction): TabManagerState => {
	switch (action.type) {
		case "CREATE_TAB": {
			if (state.tabs.length >= MAX_TABS) return state;
			const newTab = createNewTab(action.payload.preset, state.tabs, action.payload.tabId);
			return {
				tabs: [...state.tabs, newTab],
				activeTabId: newTab.id,
			};
		}

		case "CLOSE_TAB": {
			const { tabId } = action.payload;
			const newTabs = state.tabs.filter((t) => t.id !== tabId);
			
			// If no tabs left, return empty state
			if (newTabs.length === 0) {
				return { tabs: [], activeTabId: null };
			}
			
			// If closing active tab, switch to adjacent tab
			let newActiveId = state.activeTabId;
			if (state.activeTabId === tabId) {
				const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
				// Try next tab, otherwise previous
				newActiveId = newTabs[closedIndex]?.id ?? newTabs[closedIndex - 1]?.id ?? newTabs[0]?.id ?? null;
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

		case "UPDATE_TAB_LABEL": {
			const { tabId, label } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, label } : t
				),
			};
		}

		case "UPDATE_TAB_DRAFT": {
			const { tabId, draft } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, draft, isDirty: true } : t
				),
			};
		}

		case "SET_TAB_MESSAGES": {
			const { tabId, messages } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, messages } : t
				),
			};
		}

		case "PUSH_TAB_MESSAGE": {
			const { tabId, message } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, messages: [...t.messages, message] } : t
				),
			};
		}

		case "UPDATE_TAB_MESSAGE": {
			const { tabId, messageId, patch } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId
						? {
								...t,
								messages: t.messages.map((m) =>
									m.id === messageId ? { ...m, ...patch } : m
								),
						  }
						: t
				),
			};
		}

		case "SET_TAB_SENDING": {
			const { tabId, sending } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, sending } : t
				),
			};
		}

		case "SET_TAB_ERROR": {
			const { tabId, error } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, error } : t
				),
			};
		}

		case "ATTACH_TAB_PROJECT": {
			const { tabId, projectId } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, projectId, isDirty: false } : t
				),
			};
		}

		case "SET_TAB_VERSION_GRAPH": {
			const { tabId, versionGraph } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, versionGraph } : t
				),
			};
		}

		case "SET_TAB_PRESET": {
			const { tabId, preset } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, preset } : t
				),
			};
		}

		case "MARK_TAB_DIRTY": {
			const { tabId, isDirty } = action.payload;
			return {
				...state,
				tabs: state.tabs.map((t) =>
					t.id === tabId ? { ...t, isDirty } : t
				),
			};
		}

		case "RESTORE_TABS": {
			return {
				tabs: action.payload.tabs,
				activeTabId: action.payload.activeTabId,
			};
		}

		case "REORDER_TABS": {
			const { fromIndex, toIndex } = action.payload;
			if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || 
			    fromIndex >= state.tabs.length || toIndex >= state.tabs.length) {
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

export function useTabManager() {
	const [state, dispatch] = useReducer(reducer, initialState);
	const isInitialized = useRef(false);

	// Get active tab
	const activeTab = state.tabs.find((t) => t.id === state.activeTabId) ?? null;

	// Persist state to localStorage
	useEffect(() => {
		if (!isInitialized.current) return; // Don't save during initial load
		if (isFactoryResetInProgress()) return; // Don't save during factory reset
		
		const persistData = {
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
		};
		
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
		} catch (error) {
			console.error("Failed to persist tabs:", error);
		}
	}, [state.tabs, state.activeTabId]);

	// Save on beforeunload to ensure data is persisted when app closes
	useEffect(() => {
		const handleBeforeUnload = () => {
			if (!isInitialized.current) return;
			if (isFactoryResetInProgress()) return; // Don't save during factory reset
			
			const persistData = {
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
			};
			
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
			} catch (error) {
				console.error("Failed to persist tabs on unload:", error);
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [state.tabs, state.activeTabId]);

	// Restore state from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (parsed.tabs && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
					// Validate and restore tabs
					const restoredTabs: Tab[] = parsed.tabs
						.filter((t: any) => t && t.id && t.preset && t.label) // Validate required fields
						.map((t: any) => ({
							id: t.id,
							label: t.label,
							preset: t.preset,
							projectId: t.projectId || null,
							draft: t.draft || "",
							messages: Array.isArray(t.messages) ? t.messages : [],
							versionGraph: t.versionGraph || createVersionGraph("", "Start"),
							sending: false,
							error: null,
							isDirty: false, // Reset dirty state on restore
						}));
					
					if (restoredTabs.length > 0) {
						// Validate activeTabId exists in restored tabs
						const validActiveTabId = parsed.activeTabId && 
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
			}
		} catch (error) {
			console.error("Failed to restore tabs:", error);
			// Clear corrupted data
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// Ignore cleanup errors
			}
		} finally {
			isInitialized.current = true;
		}
	}, []);

	// Tab management functions
	const createTab = useCallback((preset: PromptPresetSummary): string => {
		const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		dispatch({ type: "CREATE_TAB", payload: { preset, tabId } });
		return tabId;
	}, []);

	const closeTab = useCallback((tabId: string) => {
		dispatch({ type: "CLOSE_TAB", payload: { tabId } });
	}, []);

	const switchTab = useCallback((tabId: string) => {
		dispatch({ type: "SWITCH_TAB", payload: { tabId } });
	}, []);

	const updateTabLabel = useCallback((tabId: string, label: string) => {
		dispatch({ type: "UPDATE_TAB_LABEL", payload: { tabId, label } });
	}, []);

	const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
		dispatch({ type: "REORDER_TABS", payload: { fromIndex, toIndex } });
	}, []);

	// Active tab operations
	const updateDraft = useCallback(
		(draft: string) => {
			if (!activeTab) return;
			dispatch({ type: "UPDATE_TAB_DRAFT", payload: { tabId: activeTab.id, draft } });
		},
		[activeTab]
	);

	const setMessages = useCallback(
		(messages: MessageItem[]) => {
			if (!activeTab) return;
			dispatch({ type: "SET_TAB_MESSAGES", payload: { tabId: activeTab.id, messages } });
		},
		[activeTab]
	);

	const pushMessage = useCallback(
		(message: MessageItem) => {
			if (!activeTab) return;
			dispatch({ type: "PUSH_TAB_MESSAGE", payload: { tabId: activeTab.id, message } });
		},
		[activeTab]
	);

	const updateMessage = useCallback(
		(messageId: string, patch: Partial<MessageItem>) => {
			if (!activeTab) return;
			dispatch({
				type: "UPDATE_TAB_MESSAGE",
				payload: { tabId: activeTab.id, messageId, patch },
			});
		},
		[activeTab]
	);

	const setSending = useCallback(
		(sending: boolean) => {
			if (!activeTab) return;
			dispatch({ type: "SET_TAB_SENDING", payload: { tabId: activeTab.id, sending } });
		},
		[activeTab]
	);

	const setError = useCallback(
		(error: string | null) => {
			if (!activeTab) return;
			dispatch({ type: "SET_TAB_ERROR", payload: { tabId: activeTab.id, error } });
		},
		[activeTab]
	);

	const attachProject = useCallback(
		(projectId: string | null) => {
			if (!activeTab) return;
			dispatch({ type: "ATTACH_TAB_PROJECT", payload: { tabId: activeTab.id, projectId } });
		},
		[activeTab]
	);

	const setVersionGraph = useCallback(
		(versionGraph: VersionGraph) => {
			if (!activeTab) return;
			dispatch({
				type: "SET_TAB_VERSION_GRAPH",
				payload: { tabId: activeTab.id, versionGraph },
			});
		},
		[activeTab]
	);

	const setPreset = useCallback(
		(preset: PromptPresetSummary) => {
			if (!activeTab) return;
			dispatch({ type: "SET_TAB_PRESET", payload: { tabId: activeTab.id, preset } });
		},
		[activeTab]
	);

	const markDirty = useCallback(
		(isDirty: boolean) => {
			if (!activeTab) return;
			dispatch({ type: "MARK_TAB_DIRTY", payload: { tabId: activeTab.id, isDirty } });
		},
		[activeTab]
	);

	// Check if a project is already open in a tab
	const findTabByProjectId = useCallback(
		(projectId: string): Tab | null => {
			return state.tabs.find((t) => t.projectId === projectId) ?? null;
		},
		[state.tabs]
	);

	// Explicit tabId-based setters (don't rely on activeTab - safe for async operations)
	const updateDraftForTab = useCallback((tabId: string, draft: string) => {
		dispatch({ type: "UPDATE_TAB_DRAFT", payload: { tabId, draft } });
	}, []);

	const setMessagesForTab = useCallback((tabId: string, messages: MessageItem[]) => {
		dispatch({ type: "SET_TAB_MESSAGES", payload: { tabId, messages } });
	}, []);

	const setVersionGraphForTab = useCallback((tabId: string, versionGraph: VersionGraph) => {
		dispatch({ type: "SET_TAB_VERSION_GRAPH", payload: { tabId, versionGraph } });
	}, []);

	const attachProjectForTab = useCallback((tabId: string, projectId: string | null) => {
		dispatch({ type: "ATTACH_TAB_PROJECT", payload: { tabId, projectId } });
	}, []);

	const setErrorForTab = useCallback((tabId: string, error: string | null) => {
		dispatch({ type: "SET_TAB_ERROR", payload: { tabId, error } });
	}, []);

	return {
		tabs: state.tabs,
		activeTabId: state.activeTabId,
		activeTab,
		maxTabs: MAX_TABS,
		canCreateTab: state.tabs.length < MAX_TABS,
		
		// Tab management
		createTab,
		closeTab,
		switchTab,
		updateTabLabel,
		reorderTabs,
		findTabByProjectId,
		
		// Active tab operations
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

		// Explicit tabId-based operations (for async-safe usage)
		updateDraftForTab,
		setMessagesForTab,
		setVersionGraphForTab,
		attachProjectForTab,
		setErrorForTab,
	};
}

