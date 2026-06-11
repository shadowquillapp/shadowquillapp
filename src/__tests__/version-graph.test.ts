import { describe, expect, it } from "vitest";
import {
	appendVersion,
	createVersionGraph,
	getActiveContent,
	getOutputMessageId,
	jumpToVersion,
	migrateVersionGraph,
	versionList,
} from "@/app/workbench/_components/workbench/version-graph";

describe("version-graph", () => {
	it("creates a single-node graph with baseline content", () => {
		const graph = createVersionGraph("baseline prompt", "Preset Baseline");

		expect(versionList(graph)).toHaveLength(1);
		expect(getActiveContent(graph)).toBe("baseline prompt");
		expect(getOutputMessageId(graph)).toBeNull();
	});

	it("appends versions on a linear branch and moves the active pointer", () => {
		const base = createVersionGraph("v1", "v1");
		const next = appendVersion(base, "v2", "v2", "input v2", "out-2");

		expect(versionList(next)).toHaveLength(2);
		expect(getActiveContent(next)).toBe("v2");
		expect(getOutputMessageId(next)).toBe("out-2");
	});

	it("prunes forward siblings when branching from an earlier version", () => {
		const base = createVersionGraph("v1", "v1");
		const second = appendVersion(base, "v2", "v2");
		const rewound = jumpToVersion(second, base.activeId);
		const branch = appendVersion(rewound, "v2b", "v2b");

		expect(versionList(branch)).toHaveLength(2);
		expect(getActiveContent(branch)).toBe("v2b");
		expect(branch.nodes[second.activeId]).toBeUndefined();
	});

	it("migrates legacy nodes missing originalInput and outputMessageId", () => {
		const legacy = {
			nodes: {
				a: {
					id: "a",
					label: "legacy",
					content: "compiled",
					createdAt: 1,
					prevId: null,
					nextId: null,
				},
			},
			headId: "a",
			tailId: "a",
			activeId: "a",
		};

		const migrated = migrateVersionGraph(legacy as never, [
			{
				id: "msg-1",
				role: "assistant",
				content: "output",
				createdAt: 1,
			},
		]);

		expect(migrated.nodes.a?.originalInput).toBe("compiled");
		expect(migrated.nodes.a?.outputMessageId).toBe("msg-1");
	});
});
