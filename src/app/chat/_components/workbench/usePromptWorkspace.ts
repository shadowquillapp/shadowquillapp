import {
	useCallback,
	useMemo,
	useReducer,
	useRef,
	useEffect,
} from "react";

import type {
	MessageItem,
	PromptPresetSummary,
	VersionGraph,
	VersionNode,
} from "./types";
import {
	appendVersion,
	createVersionGraph,
	getActiveContent,
	hasRedo,
	hasUndo,
	jumpToVersion,
	redoVersion,
	undoVersion,
	versionList,
} from "./version-graph";


interface PromptSessionState {
	draft: string;
	messages: MessageItem[];
	sending: boolean;
	error: string | null;
	preset: PromptPresetSummary | null;
	versionGraph: VersionGraph;
	projectId: string | null;
}

type Action =
	| { type: "SET_PRESET"; payload: { preset: PromptPresetSummary; initialDraft?: string } }
	| { type: "UPDATE_DRAFT"; payload: { draft: string } }
	| { type: "COMMIT_VERSION"; payload: { label?: string } }
	| { type: "UNDO_VERSION" }
	| { type: "REDO_VERSION" }
	| { type: "JUMP_TO_VERSION"; payload: { versionId: string } }
	| { type: "SET_MESSAGES"; payload: { messages: MessageItem[] } }
	| { type: "PUSH_MESSAGE"; payload: { message: MessageItem } }
	| { type: "UPDATE_MESSAGE"; payload: { messageId: string; patch: Partial<MessageItem> } }
	| { type: "SET_SENDING"; payload: { sending: boolean } }
	| { type: "SET_ERROR"; payload: { error: string | null } }
	| { type: "ATTACH_PROJECT"; payload: { projectId: string | null } }
	| { type: "SET_VERSION_GRAPH"; payload: { versionGraph: VersionGraph; draft?: string } };

const initialState: PromptSessionState = {
	draft: "",
	messages: [],
	sending: false,
	error: null,
	preset: null,
	versionGraph: createVersionGraph("", "Start"),
	projectId: null,
};

const countVersions = (graph: VersionGraph) => {
	let count = 0;
	let cursor: string | null = graph.headId;
	while (cursor) {
		const node: VersionNode | undefined = graph.nodes[cursor];
		// Don't count the "Start" node
		if (node && node.label !== "Start") {
			count += 1;
		}
		if (!node?.nextId) break;
		cursor = node.nextId ?? null;
	}
	return count;
};

const reducer = (state: PromptSessionState, action: Action): PromptSessionState => {
	switch (action.type) {
		case "SET_PRESET": {
			const { preset, initialDraft = "" } = action.payload;
			const graph = createVersionGraph("", "Start");
			return {
				...initialState,
				preset,
				draft: initialDraft,
				versionGraph: graph,
			};
		}
		case "UPDATE_DRAFT": {
			return { ...state, draft: action.payload.draft };
		}
		case "COMMIT_VERSION": {
			const versionCount = countVersions(state.versionGraph);
			const currentActiveContent = getActiveContent(state.versionGraph);
			const activeNode = state.versionGraph.nodes[state.versionGraph.activeId];
			const isInitialState = activeNode?.label === "Start" && currentActiveContent === "";

			const label =
				action.payload.label?.trim() ||
				`Version ${versionCount + 1}`;
			
			const graph = isInitialState
				? createVersionGraph(state.draft, label)
				: appendVersion(state.versionGraph, state.draft, label);

			return {
				...state,
				versionGraph: graph,
				draft: getActiveContent(graph),
			};
		}
		case "UNDO_VERSION": {
			const nextGraph = undoVersion(state.versionGraph);
			if (!nextGraph) return state;
			return {
				...state,
				versionGraph: nextGraph,
				draft: getActiveContent(nextGraph),
			};
		}
		case "REDO_VERSION": {
			const nextGraph = redoVersion(state.versionGraph);
			if (!nextGraph) return state;
			return {
				...state,
				versionGraph: nextGraph,
				draft: getActiveContent(nextGraph),
			};
		}
		case "JUMP_TO_VERSION": {
			const nextGraph = jumpToVersion(state.versionGraph, action.payload.versionId);
			if (nextGraph === state.versionGraph) return state;
			return {
				...state,
				versionGraph: nextGraph,
				draft: getActiveContent(nextGraph),
			};
		}
		case "SET_MESSAGES": {
			return { ...state, messages: action.payload.messages };
		}
		case "PUSH_MESSAGE": {
			return { ...state, messages: [...state.messages, action.payload.message] };
		}
		case "UPDATE_MESSAGE": {
			return {
				...state,
				messages: state.messages.map((msg) =>
					msg.id === action.payload.messageId
						? { ...msg, ...action.payload.patch }
						: msg,
				),
			};
		}
		case "SET_SENDING": {
			return { ...state, sending: action.payload.sending };
		}
		case "SET_ERROR": {
			return { ...state, error: action.payload.error };
		}
		case "ATTACH_PROJECT": {
			return { ...state, projectId: action.payload.projectId };
		}
		case "SET_VERSION_GRAPH": {
			const { versionGraph, draft } = action.payload;
			return {
				...state,
				versionGraph,
				draft: draft ?? getActiveContent(versionGraph),
			};
		}
		default:
			return state;
	}
};

export function usePromptWorkspace() {
	const [state, dispatch] = useReducer(reducer, initialState);

	const setPreset = useCallback(
		(preset: PromptPresetSummary, initialDraft?: string) => {
			dispatch({ 
				type: "SET_PRESET", 
				payload: initialDraft !== undefined ? { preset, initialDraft } : { preset } 
			});
		},
		[],
	);

	const updateDraft = useCallback((draft: string) => {
		dispatch({ type: "UPDATE_DRAFT", payload: { draft } });
	}, []);

	const commitDraft = useCallback((label?: string) => {
		dispatch({ 
			type: "COMMIT_VERSION", 
			payload: label !== undefined ? { label } : {} 
		});
	}, []);

	const undo = useCallback(() => {
		dispatch({ type: "UNDO_VERSION" });
	}, []);

	const redo = useCallback(() => {
		dispatch({ type: "REDO_VERSION" });
	}, []);

	const jump = useCallback((versionId: string) => {
		dispatch({ type: "JUMP_TO_VERSION", payload: { versionId } });
	}, []);

	const setMessages = useCallback((messages: MessageItem[]) => {
		dispatch({ type: "SET_MESSAGES", payload: { messages } });
	}, []);

	const pushMessage = useCallback((message: MessageItem) => {
		dispatch({ type: "PUSH_MESSAGE", payload: { message } });
	}, []);

	const updateMessage = useCallback(
		(messageId: string, patch: Partial<MessageItem>) => {
			dispatch({
				type: "UPDATE_MESSAGE",
				payload: { messageId, patch },
			});
		},
		[],
	);

	const setSending = useCallback((sending: boolean) => {
		dispatch({ type: "SET_SENDING", payload: { sending } });
	}, []);

	const setError = useCallback((error: string | null) => {
		dispatch({ type: "SET_ERROR", payload: { error } });
	}, []);

	const attachProject = useCallback((projectId: string | null) => {
		dispatch({ type: "ATTACH_PROJECT", payload: { projectId } });
	}, []);

	const setVersionGraph = useCallback(
		(versionGraph: VersionGraph, draft?: string) => {
			dispatch({ type: "SET_VERSION_GRAPH", payload: { versionGraph, draft } });
		},
		[],
	);

	return {
		session: state,
		setPreset,
		updateDraft,
		commitDraft,
		undo,
		redo,
		jumpToVersion: jump,
		setMessages,
		pushMessage,
		updateMessage,
		setSending,
		setError,
		attachProject,
		setVersionGraph,
		hasUndo: hasUndo(state.versionGraph),
		hasRedo: hasRedo(state.versionGraph),
		activeContent: getActiveContent(state.versionGraph),
	};
}
