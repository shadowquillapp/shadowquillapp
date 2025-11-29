import {
	appendMessagesWithCap,
	createProject,
	deleteProject,
	deleteProjects,
	getProject,
	listProjectsByUser,
	updateProjectVersionGraph,
} from "@/lib/local-db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock crypto.getRandomValues for consistent test behavior
const mockCrypto = {
	getRandomValues: vi.fn((array: Uint32Array) => {
		array[0] = 123456789;
		array[1] = 987654321;
		return array;
	}),
};

Object.defineProperty(global, "crypto", {
	value: mockCrypto,
	writable: true,
});

describe("local-db", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		// Reset date mock if any
		vi.useRealTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("createProject", () => {
		it("should create a project with generated id", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

			const project = await createProject("Test Project");

			expect(project.id).toMatch(/^project-\d+-[a-z0-9]+$/);
			expect(project.title).toBe("Test Project");
			expect(project.userId).toBe("local-user");
			expect(project.createdAt).toBeInstanceOf(Date);
			expect(project.updatedAt).toBeInstanceOf(Date);

			vi.useRealTimers();
		});

		it("should create a project with null title when not provided", async () => {
			const project = await createProject();

			expect(project.title).toBeNull();
		});

		it("should create a project with custom userId", async () => {
			const project = await createProject("Test", "custom-user-id");

			expect(project.userId).toBe("custom-user-id");
		});

		it("should create a project with presetId", async () => {
			const project = await createProject("Test", "local-user", "preset-123");

			expect(project.presetId).toBe("preset-123");
		});

		it("should store project in localStorage", async () => {
			const project = await createProject("Stored Project");

			const stored = JSON.parse(localStorage.getItem("PC_PROJECTS") || "{}");
			expect(stored[project.id]).toBeDefined();
			expect(stored[project.id].title).toBe("Stored Project");
		});
	});

	describe("listProjectsByUser", () => {
		it("should return empty array when no projects exist", async () => {
			const projects = await listProjectsByUser();

			expect(projects).toEqual([]);
		});

		it("should return projects for default local-user", async () => {
			await createProject("Project 1");
			await createProject("Project 2");

			const projects = await listProjectsByUser();

			expect(projects).toHaveLength(2);
		});

		it("should filter projects by userId", async () => {
			await createProject("User 1 Project", "user-1");
			await createProject("User 2 Project", "user-2");

			const projects = await listProjectsByUser("user-1");

			expect(projects).toHaveLength(1);
			expect(projects[0]?.title).toBe("User 1 Project");
		});

		it("should sort projects by updatedAt in descending order", async () => {
			vi.useFakeTimers();

			vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
			await createProject("Older Project");

			vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));
			await createProject("Newer Project");

			const projects = await listProjectsByUser();

			expect(projects[0]?.title).toBe("Newer Project");
			expect(projects[1]?.title).toBe("Older Project");

			vi.useRealTimers();
		});

		it("should include messageCount for each project", async () => {
			// Use different crypto values to generate unique message IDs
			let callCount = 0;
			mockCrypto.getRandomValues.mockImplementation((array: Uint32Array) => {
				callCount++;
				array[0] = 100000000 + callCount;
				array[1] = 200000000 + callCount;
				return array;
			});

			const project = await createProject("Project with messages");
			// Add messages one at a time to ensure they are stored correctly
			await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Hello" }],
				100,
			);
			await appendMessagesWithCap(
				project.id,
				[{ role: "assistant", content: "Hi there" }],
				100,
			);

			const projects = await listProjectsByUser();
			const found = projects.find((p) => p.id === project.id);

			expect(found?.messageCount).toBe(2);
		});

		it("should convert timestamps to Date objects", async () => {
			await createProject("Test Project");

			const projects = await listProjectsByUser();

			expect(projects[0]?.createdAt).toBeInstanceOf(Date);
			expect(projects[0]?.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe("getProject", () => {
		it("should return project with messages", async () => {
			const created = await createProject("Test Project");
			await appendMessagesWithCap(
				created.id,
				[{ role: "user", content: "Test message" }],
				100,
			);

			const project = await getProject(created.id);

			expect(project.id).toBe(created.id);
			expect(project.title).toBe("Test Project");
			expect(project.messages).toHaveLength(1);
			expect(project.messages[0]?.content).toBe("Test message");
		});

		it("should return 'Untitled' when project has no title", async () => {
			const created = await createProject();

			const project = await getProject(created.id);

			expect(project.title).toBe("Untitled");
		});

		it("should return 'Untitled' when project does not exist", async () => {
			const project = await getProject("non-existent-id");

			expect(project.title).toBe("Untitled");
			expect(project.messages).toEqual([]);
		});

		it("should limit messages to specified count", async () => {
			vi.useFakeTimers();
			const created = await createProject("Test");

			for (let i = 0; i < 10; i++) {
				// Advance time to ensure distinct timestamps
				vi.setSystemTime(new Date(2024, 0, 1, 0, 0, i));
				await appendMessagesWithCap(
					created.id,
					[{ role: "user", content: `Message ${i}` }],
					100,
				);
			}

			const project = await getProject(created.id, 5);

			expect(project.messages).toHaveLength(5);
			// Should return the LAST 5 messages
			expect(project.messages[0]?.content).toBe("Message 5");
			expect(project.messages[4]?.content).toBe("Message 9");

			vi.useRealTimers();
		});

		it("should sort messages by createdAt", async () => {
			vi.useFakeTimers();
			const created = await createProject("Test");

			vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
			await appendMessagesWithCap(
				created.id,
				[{ role: "user", content: "First" }],
				100,
			);

			vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));
			await appendMessagesWithCap(
				created.id,
				[{ role: "assistant", content: "Second" }],
				100,
			);

			const project = await getProject(created.id);

			expect(project.messages[0]?.content).toBe("First");
			expect(project.messages[1]?.content).toBe("Second");

			vi.useRealTimers();
		});

		it("should include versionGraph when present", async () => {
			const created = await createProject("Test");
			const versionGraph = { nodes: [], edges: [] };
			await updateProjectVersionGraph(created.id, versionGraph);

			const project = await getProject(created.id);

			expect(project.versionGraph).toEqual(versionGraph);
		});

		it("should include presetId when present", async () => {
			const created = await createProject("Test", "local-user", "preset-123");

			const project = await getProject(created.id);

			expect(project.presetId).toBe("preset-123");
		});

		it("should convert message timestamps to Date objects", async () => {
			const created = await createProject("Test");
			await appendMessagesWithCap(
				created.id,
				[{ role: "user", content: "Test" }],
				100,
			);

			const project = await getProject(created.id);

			expect(project.messages[0]?.createdAt).toBeInstanceOf(Date);
		});
	});

	describe("appendMessagesWithCap", () => {
		it("should add messages to project", async () => {
			const project = await createProject("Test");

			const result = await appendMessagesWithCap(
				project.id,
				[
					{ role: "user", content: "Hello" },
					{ role: "assistant", content: "Hi!" },
				],
				100,
			);

			expect(result.created).toHaveLength(2);
			expect(result.created[0]?.role).toBe("user");
			expect(result.created[0]?.content).toBe("Hello");
			expect(result.created[1]?.role).toBe("assistant");
			expect(result.created[1]?.content).toBe("Hi!");
		});

		it("should generate unique message ids", async () => {
			const project = await createProject("Test");

			const result1 = await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "First" }],
				100,
			);

			// Mock different crypto values for second call
			mockCrypto.getRandomValues.mockImplementationOnce(
				(array: Uint32Array) => {
					array[0] = 111111111;
					array[1] = 222222222;
					return array;
				},
			);

			const result2 = await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Second" }],
				100,
			);

			expect(result1.created[0]?.id).not.toBe(result2.created[0]?.id);
		});

		it("should enforce message cap per project", async () => {
			vi.useFakeTimers();
			const project = await createProject("Test");

			// Add first batch of messages
			vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
			await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Message 1" }],
				3,
			);

			vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 1));
			await appendMessagesWithCap(
				project.id,
				[{ role: "assistant", content: "Message 2" }],
				3,
			);

			vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 2));
			await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Message 3" }],
				3,
			);

			// Now add 2 more messages - should trigger deletion
			vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 3));
			await appendMessagesWithCap(
				project.id,
				[{ role: "assistant", content: "Message 4" }],
				3,
			);

			vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 4));
			const result = await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Message 5" }],
				3,
			);

			// Messages 1 and 2 should have been deleted in batches
			const retrieved = await getProject(project.id);
			expect(retrieved.messages).toHaveLength(3);
			// The remaining messages should be Message 3, 4, 5
			expect(retrieved.messages.map((m) => m.content)).toEqual([
				"Message 3",
				"Message 4",
				"Message 5",
			]);

			vi.useRealTimers();
		});

		it("should return empty deletedIds when under cap", async () => {
			const project = await createProject("Test");

			const result = await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Hello" }],
				100,
			);

			expect(result.deletedIds).toEqual([]);
		});

		it("should update project timestamp when adding messages", async () => {
			vi.useFakeTimers();

			vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
			const project = await createProject("Test");
			const originalUpdatedAt = project.updatedAt;

			vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));
			await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Hello" }],
				100,
			);

			const projects = await listProjectsByUser();
			const updatedProject = projects.find((p) => p.id === project.id);

			expect(updatedProject?.updatedAt.getTime()).toBeGreaterThan(
				originalUpdatedAt.getTime(),
			);

			vi.useRealTimers();
		});

		it("should include createdAt as Date in returned messages", async () => {
			const project = await createProject("Test");

			const result = await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Hello" }],
				100,
			);

			expect(result.created[0]?.createdAt).toBeInstanceOf(Date);
		});

		it("should handle non-existent project gracefully", async () => {
			const result = await appendMessagesWithCap(
				"non-existent",
				[{ role: "user", content: "Hello" }],
				100,
			);

			expect(result.created).toHaveLength(1);
			// Project timestamp update should not throw
		});
	});

	describe("updateProjectVersionGraph", () => {
		it("should update version graph for existing project", async () => {
			const project = await createProject("Test");
			const versionGraph = { nodes: [{ id: "1" }], edges: [] };

			await updateProjectVersionGraph(project.id, versionGraph);

			const retrieved = await getProject(project.id);
			expect(retrieved.versionGraph).toEqual(versionGraph);
		});

		it("should update project timestamp", async () => {
			vi.useFakeTimers();

			vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
			const project = await createProject("Test");

			vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));
			await updateProjectVersionGraph(project.id, { updated: true });

			const projects = await listProjectsByUser();
			const updatedProject = projects.find((p) => p.id === project.id);

			expect(updatedProject?.updatedAt.getTime()).toBe(
				new Date("2024-01-02T00:00:00Z").getTime(),
			);

			vi.useRealTimers();
		});

		it("should handle non-existent project gracefully", async () => {
			// Should not throw
			await expect(
				updateProjectVersionGraph("non-existent", { data: "test" }),
			).resolves.not.toThrow();
		});
	});

	describe("deleteProject", () => {
		it("should remove project from storage", async () => {
			const project = await createProject("To Delete");

			await deleteProject(project.id);

			const projects = await listProjectsByUser();
			expect(projects.find((p) => p.id === project.id)).toBeUndefined();
		});

		it("should remove associated messages", async () => {
			const project = await createProject("To Delete");
			await appendMessagesWithCap(
				project.id,
				[
					{ role: "user", content: "Message 1" },
					{ role: "assistant", content: "Message 2" },
				],
				100,
			);

			await deleteProject(project.id);

			const retrieved = await getProject(project.id);
			expect(retrieved.messages).toEqual([]);
		});

		it("should not affect other projects", async () => {
			const project1 = await createProject("Keep");
			const project2 = await createProject("Delete");

			await deleteProject(project2.id);

			const projects = await listProjectsByUser();
			expect(projects).toHaveLength(1);
			expect(projects[0]?.id).toBe(project1.id);
		});

		it("should handle non-existent project gracefully", async () => {
			await expect(deleteProject("non-existent")).resolves.not.toThrow();
		});
	});

	describe("deleteProjects", () => {
		it("should delete multiple projects", async () => {
			const project1 = await createProject("Delete 1");
			const project2 = await createProject("Delete 2");
			const project3 = await createProject("Keep");

			await deleteProjects([project1.id, project2.id]);

			const projects = await listProjectsByUser();
			expect(projects).toHaveLength(1);
			expect(projects[0]?.id).toBe(project3.id);
		});

		it("should delete all associated messages", async () => {
			const project1 = await createProject("Delete 1");
			const project2 = await createProject("Delete 2");

			await appendMessagesWithCap(
				project1.id,
				[{ role: "user", content: "P1 Message" }],
				100,
			);
			await appendMessagesWithCap(
				project2.id,
				[{ role: "user", content: "P2 Message" }],
				100,
			);

			await deleteProjects([project1.id, project2.id]);

			const retrieved1 = await getProject(project1.id);
			const retrieved2 = await getProject(project2.id);

			expect(retrieved1.messages).toEqual([]);
			expect(retrieved2.messages).toEqual([]);
		});

		it("should handle empty array", async () => {
			await createProject("Should remain");

			await deleteProjects([]);

			const projects = await listProjectsByUser();
			expect(projects).toHaveLength(1);
		});

		it("should handle non-existent ids gracefully", async () => {
			await expect(
				deleteProjects(["non-existent-1", "non-existent-2"]),
			).resolves.not.toThrow();
		});
	});

	describe("cryptoRandomId fallback", () => {
		it("should fallback to Math.random when crypto fails", async () => {
			const originalCrypto = global.crypto;

			// Make crypto.getRandomValues throw
			Object.defineProperty(global, "crypto", {
				value: {
					getRandomValues: () => {
						throw new Error("Crypto not available");
					},
				},
				writable: true,
			});

			const project = await createProject("Test");
			await appendMessagesWithCap(
				project.id,
				[{ role: "user", content: "Test" }],
				100,
			);

			const retrieved = await getProject(project.id);
			expect(retrieved.messages).toHaveLength(1);
			expect(retrieved.messages[0]?.id).toMatch(/^msg-\d+-[a-z0-9]+$/);

			// Restore crypto
			Object.defineProperty(global, "crypto", {
				value: originalCrypto,
				writable: true,
			});
		});
	});
});
