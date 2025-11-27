import type { VersionGraph, VersionNode } from "./types";

const makeId = () => {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `vg_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
};

export const versionId = makeId;

const cloneGraph = (graph: VersionGraph): VersionGraph => ({
	...graph,
	nodes: { ...graph.nodes },
});

function pruneForward(graph: VersionGraph, anchorId: string): VersionGraph {
	const anchor = graph.nodes[anchorId];
	if (!anchor) return graph;
	const result = cloneGraph(graph);
	let cursor = anchor.nextId;
	while (cursor) {
		const next = result.nodes[cursor];
		delete result.nodes[cursor];
		cursor = next?.nextId ?? null;
	}
	result.nodes[anchorId] = { ...anchor, nextId: null };
	return { ...result, tailId: anchorId, activeId: anchorId };
}

export function createVersionGraph(
	initialContent: string,
	label = "Preset Baseline",
	originalInput?: string,
	outputMessageId?: string | null,
): VersionGraph {
	const id = makeId();
	const node: VersionNode = {
		id,
		label,
		content: initialContent,
		originalInput: originalInput ?? initialContent,
		outputMessageId: outputMessageId ?? null,
		createdAt: Date.now(),
		prevId: null,
		nextId: null,
	};
	return {
		nodes: { [id]: node },
		headId: id,
		tailId: id,
		activeId: id,
	};
}

export function appendVersion(
	graph: VersionGraph,
	content: string,
	label: string,
	originalInput?: string,
	outputMessageId?: string | null,
	metadata?: { taskType?: string; options?: any },
): VersionGraph {
	const trimmed = content ?? "";
	const cleaned = pruneForward(graph, graph.activeId);
	const parent = cleaned.nodes[cleaned.activeId];
	if (!parent) return cleaned;
	const newId = makeId();
	const nextNode: VersionNode = {
		id: newId,
		label,
		content: trimmed,
		originalInput: originalInput ?? trimmed,
		outputMessageId: outputMessageId ?? null,
		createdAt: Date.now(),
		prevId: parent.id,
		nextId: null,
	};
	if (metadata) {
		nextNode.metadata = metadata;
	}
	cleaned.nodes[parent.id] = { ...parent, nextId: newId };
	return {
		nodes: { ...cleaned.nodes, [newId]: nextNode },
		headId: cleaned.headId,
		tailId: newId,
		activeId: newId,
	};
}

export function jumpToVersion(
	graph: VersionGraph,
	targetId: string,
): VersionGraph {
	if (!graph.nodes[targetId]) return graph;
	return { ...graph, activeId: targetId };
}

export function undoVersion(graph: VersionGraph): VersionGraph | null {
	const active = graph.nodes[graph.activeId];
	if (!active?.prevId) return null;
	return { ...graph, activeId: active.prevId };
}

export function redoVersion(graph: VersionGraph): VersionGraph | null {
	const active = graph.nodes[graph.activeId];
	if (!active?.nextId) return null;
	return { ...graph, activeId: active.nextId };
}

export function versionList(graph: VersionGraph): VersionNode[] {
	const list: VersionNode[] = [];
	let cursor: string | null = graph.headId;
	while (cursor) {
		const node: VersionNode | undefined = graph.nodes[cursor];
		if (!node) break;
		list.push(node);
		cursor = node.nextId;
	}
	return list;
}

export function getActiveContent(graph: VersionGraph): string {
	return graph.nodes[graph.activeId]?.content ?? "";
}

export function hasUndo(graph: VersionGraph): boolean {
	const active = graph.nodes[graph.activeId];
	return Boolean(active?.prevId);
}

export function hasRedo(graph: VersionGraph): boolean {
	const active = graph.nodes[graph.activeId];
	return Boolean(active?.nextId);
}

export function getOutputMessageId(graph: VersionGraph, versionId?: string): string | null {
	const id = versionId ?? graph.activeId;
	const node = graph.nodes[id];
	return node?.outputMessageId ?? null;
}

// Migration helper for backward compatibility with old version graphs
export function migrateVersionGraph(graph: VersionGraph, messages?: Array<{ id: string; role: string; content: string; createdAt?: number }>): VersionGraph {
	let needsMigration = false;
	const migratedNodes: Record<string, VersionNode> = {};
	
	// Check if any node needs migration
	for (const [id, node] of Object.entries(graph.nodes)) {
		if (!('originalInput' in node) || !('outputMessageId' in node)) {
			needsMigration = true;
			break;
		}
	}
	
	if (!needsMigration) {
		return graph;
	}
	
	// Migrate each node
	for (const [id, node] of Object.entries(graph.nodes)) {
		const migratedNode: VersionNode = {
			...node,
			originalInput: (node as any).originalInput ?? node.content,
			outputMessageId: (node as any).outputMessageId ?? null,
		};
		
		// Try to match with assistant messages by timestamp if messages are provided
		if (messages && !migratedNode.outputMessageId) {
			const assistantMessages = messages.filter(m => m.role === 'assistant');
			// Find assistant message closest in time (within 5 seconds)
			const matchingMessage = assistantMessages.find(m => {
				if (!m.createdAt) return false;
				const timeDiff = Math.abs(m.createdAt - node.createdAt);
				return timeDiff < 5000; // 5 seconds tolerance
			});
			if (matchingMessage) {
				migratedNode.outputMessageId = matchingMessage.id;
			}
		}
		
		migratedNodes[id] = migratedNode;
	}
	
	return {
		...graph,
		nodes: migratedNodes,
	};
}

