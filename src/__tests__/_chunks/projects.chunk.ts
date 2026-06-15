import { beforeEach, describe, expect, it } from "vitest";
import {
	appendMessagesWithCap,
	createProject,
	getProject,
} from "@/lib/domain/projects";

describe("appendMessagesWithCap", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("prunes the oldest message when a batch exceeds cap", async () => {
		const project = await createProject("cap test");
		const batch = [
			{ role: "user" as const, content: "first" },
			{ role: "assistant" as const, content: "second" },
			{ role: "user" as const, content: "third" },
		];

		const { deletedIds, created } = await appendMessagesWithCap(
			project.id,
			batch,
			2,
		);

		expect(created).toHaveLength(3);
		expect(deletedIds).toHaveLength(1);

		const loaded = await getProject(project.id, 10);
		expect(loaded?.messages.map((message) => message.content)).toEqual([
			"second",
			"third",
		]);
	});

	it("keeps prior messages when a new batch stays within cap", async () => {
		const project = await createProject("within cap");
		await appendMessagesWithCap(
			project.id,
			[{ role: "user", content: "seed" }],
			3,
		);

		await appendMessagesWithCap(
			project.id,
			[
				{ role: "assistant", content: "reply-a" },
				{ role: "user", content: "reply-b" },
			],
			3,
		);

		const loaded = await getProject(project.id, 10);
		expect(loaded?.messages.map((message) => message.content)).toEqual([
			"seed",
			"reply-a",
			"reply-b",
		]);
	});
});
