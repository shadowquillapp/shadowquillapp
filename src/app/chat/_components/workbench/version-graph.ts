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
): VersionGraph {
	const id = makeId();
	const node: VersionNode = {
		id,
		label,
		content: initialContent,
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
		createdAt: Date.now(),
		prevId: parent.id,
		nextId: null,
	};
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

