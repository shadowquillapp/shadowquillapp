import {
	type Preset,
	compareVersions,
	deletePresetByIdOrName,
	ensureDefaultPreset,
	exportPresetWithHistory,
	getDefaultPresets,
	getPresetById,
	getPresetHistory,
	getPresets,
	importPresetWithHistory,
	rollbackPreset,
	savePreset,
} from "@/lib/presets";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Integration tests for the preset management workflow
 * Tests complete flows: create -> update -> version history -> rollback -> export/import
 */
describe("Preset Workflow Integration", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("complete preset lifecycle", () => {
		it("should handle create -> update -> delete flow", () => {
			// Create new preset
			const created = savePreset({
				name: "My Workflow Preset",
				taskType: "coding",
				options: { tone: "technical", includeTests: true },
			});

			expect(created.id).toBeDefined();
			expect(created.createdAt).toBeDefined();
			expect(getPresets()).toHaveLength(1);

			const createdId = created.id!;

			// Update preset
			const updated = savePreset({
				id: createdId,
				name: "My Workflow Preset",
				taskType: "coding",
				options: { tone: "friendly", includeTests: true }, // Changed tone
			});

			expect(updated.id).toBe(createdId);
			expect(updated.options?.tone).toBe("friendly");
			expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt!);

			// Delete preset
			deletePresetByIdOrName(createdId);
			expect(getPresets()).toHaveLength(0);
		});

		it("should maintain version history through multiple updates", () => {
			// Create preset
			const created = savePreset({
				name: "Versioned Preset",
				taskType: "writing",
				options: { tone: "formal", writingStyle: "expository" },
			});

			const createdId = created.id!;

			// First update
			savePreset({
				id: createdId,
				name: "Versioned Preset",
				taskType: "writing",
				options: { tone: "friendly", writingStyle: "expository" },
			});

			// Second update
			savePreset({
				id: createdId,
				name: "Versioned Preset",
				taskType: "writing",
				options: { tone: "friendly", writingStyle: "narrative" },
			});

			// Third update
			savePreset({
				id: createdId,
				name: "Versioned Preset",
				taskType: "coding", // Task type change
				options: { tone: "technical" },
			});

			// Check version history
			const history = getPresetHistory(createdId);
			expect(history.length).toBe(3);

			// Latest version should be first
			expect(history[0]?.version).toBeGreaterThan(history[1]?.version ?? 0);
		});
	});

	describe("version rollback workflow", () => {
		it("should rollback to previous version and preserve history", () => {
			// Create and update preset multiple times
			const created = savePreset({
				name: "Rollback Test",
				taskType: "general",
				options: { tone: "neutral", detail: "normal" },
			});

			const createdId = created.id!;

			// First update - creates version 1 with previous state (neutral)
			savePreset({
				id: createdId,
				name: "Rollback Test",
				taskType: "general",
				options: { tone: "friendly", detail: "normal" },
			});

			// Second update - creates version 2 with previous state (friendly)
			savePreset({
				id: createdId,
				name: "Rollback Test",
				taskType: "general",
				options: { tone: "formal", detail: "detailed" },
			});

			// Get history before rollback
			const historyBefore = getPresetHistory(createdId);
			expect(historyBefore.length).toBe(2);

			// Version 1 contains the state BEFORE the first update (neutral)
			// Version 2 contains the state BEFORE the second update (friendly)
			// Rollback to version 1 restores "neutral"
			const rolledBack = rollbackPreset(createdId, 1);

			expect(rolledBack).not.toBeNull();
			// Version 1 snapshot contains the original "neutral" tone
			expect(rolledBack?.options?.tone).toBe("neutral");

			// History should have a new entry for the rollback
			const historyAfter = getPresetHistory(createdId);
			expect(historyAfter.length).toBe(3);
			expect(historyAfter[0]?.changelog).toContain("Rolled back");
		});

		it("should compare versions correctly", () => {
			// Version snapshots capture the state BEFORE each update
			// So version 1 = original state, version 2 = state after first update

			const created = savePreset({
				name: "Compare Test",
				taskType: "coding",
				options: { tone: "technical", includeTests: true, techStack: "React" },
			});

			const createdId = created.id!;

			// First update - creates version 1 with original state:
			// { tone: "technical", includeTests: true, techStack: "React" }
			savePreset({
				id: createdId,
				name: "Compare Test",
				taskType: "coding",
				options: { tone: "friendly", includeTests: false, techStack: "Vue" },
			});

			// Second update - creates version 2 with previous state:
			// { tone: "friendly", includeTests: false, techStack: "Vue" }
			savePreset({
				id: createdId,
				name: "Compare Test",
				taskType: "coding",
				options: { tone: "formal", includeTests: true },
			});

			// Now we have versions 1 and 2
			const history = getPresetHistory(createdId);
			expect(history.length).toBe(2);

			// Compare version 1 (technical, includeTests:true, techStack:React)
			// vs version 2 (friendly, includeTests:false, techStack:Vue)
			const comparison = compareVersions(createdId, 1, 2);

			expect(comparison).not.toBeNull();
			expect(comparison?.changed).toContain("tone");
			expect(comparison?.changed).toContain("includeTests");
			expect(comparison?.changed).toContain("techStack");
		});
	});

	describe("export/import workflow", () => {
		it("should export and import preset with full history", () => {
			// Create preset with history
			const created = savePreset({
				name: "Export Test",
				taskType: "marketing",
				options: { marketingChannel: "email", ctaStyle: "soft" },
			});

			const createdId = created.id!;

			savePreset({
				id: createdId,
				name: "Export Test",
				taskType: "marketing",
				options: { marketingChannel: "landing_page", ctaStyle: "strong" },
			});

			// Export
			const exported = exportPresetWithHistory(createdId);

			expect(exported).not.toBeNull();
			expect(exported?.versions?.length).toBe(1);
			expect(exported?.name).toBe("Export Test");

			// Clear storage and import
			localStorage.clear();

			const imported = importPresetWithHistory(exported!);

			expect(imported.name).toBe("Export Test");
			expect(imported.versions?.length).toBe(1);
			expect(imported.taskType).toBe("marketing");
		});

		it("should create new ID on import when overwrite is false", () => {
			// Create original preset
			const original = savePreset({
				name: "Original",
				taskType: "general",
				options: { tone: "neutral" },
			});

			const originalId = original.id!;

			// Export it
			const exported = exportPresetWithHistory(originalId);

			// Import with overwrite false (should create new preset)
			const imported = importPresetWithHistory(exported!, { overwrite: false });

			expect(imported.id).not.toBe(originalId);
			expect(getPresets()).toHaveLength(2);
		});

		it("should overwrite existing preset on import when overwrite is true", () => {
			// Create original preset
			const original = savePreset({
				name: "Original",
				taskType: "general",
				options: { tone: "neutral" },
			});

			const originalId = original.id!;

			// Modify and export
			savePreset({
				id: originalId,
				name: "Modified",
				taskType: "coding",
				options: { tone: "technical" },
			});

			const exported = exportPresetWithHistory(originalId);

			// Create a "fresh" storage state with original
			localStorage.clear();
			savePreset({
				id: originalId,
				name: "Original",
				taskType: "general",
				options: { tone: "neutral" },
			});

			// Import with overwrite
			const imported = importPresetWithHistory(exported!, { overwrite: true });

			expect(imported.id).toBe(originalId);
			expect(imported.name).toBe("Modified");
			expect(imported.taskType).toBe("coding");
			expect(getPresets()).toHaveLength(1);
		});
	});

	describe("default presets initialization", () => {
		it("should initialize default presets on first run", () => {
			expect(getPresets()).toHaveLength(0);

			ensureDefaultPreset();

			const presets = getPresets();
			expect(presets.length).toBeGreaterThan(0);

			// Check that default presets have version metadata
			for (const preset of presets) {
				expect(preset.versions).toEqual([]);
				expect(preset.currentVersion).toBe(0);
				expect(preset.createdAt).toBeDefined();
			}
		});

		it("should not overwrite existing presets on second call", () => {
			// Create custom preset
			const custom = savePreset({
				name: "My Custom Preset",
				taskType: "general",
				options: { tone: "friendly" },
			});

			// Try to initialize defaults
			ensureDefaultPreset();

			// Should still only have the custom preset
			const presets = getPresets();
			expect(presets).toHaveLength(1);
			expect(presets[0]?.id).toBe(custom.id);
		});

	it("should have all expected task types in defaults", () => {
		const defaults = getDefaultPresets();

		const taskTypes = new Set(defaults.map((p) => p.taskType));

		expect(taskTypes.has("general")).toBe(true);
		expect(taskTypes.has("coding")).toBe(true);
		expect(taskTypes.has("writing")).toBe(true);
		expect(taskTypes.has("research")).toBe(true);
		expect(taskTypes.has("marketing")).toBe(true);
	});
	});

	describe("preset lookup and filtering", () => {
		it("should find preset by ID after creation", () => {
			const preset1 = savePreset({
				name: "Preset One",
				taskType: "coding",
			});

			const preset2 = savePreset({
				name: "Preset Two",
				taskType: "writing",
			});

			const found1 = getPresetById(preset1.id!);
			const found2 = getPresetById(preset2.id!);

			expect(found1?.name).toBe("Preset One");
			expect(found2?.name).toBe("Preset Two");
		});

		it("should return undefined for non-existent ID", () => {
			savePreset({
				name: "Existing",
				taskType: "general",
			});

			const found = getPresetById("non-existent-id");
			expect(found).toBeUndefined();
		});
	});

	describe("edge cases and error handling", () => {
		it("should handle preset with no options", () => {
			const preset = savePreset({
				name: "Minimal Preset",
				taskType: "general",
			});

			expect(preset.id).toBeDefined();
			expect(preset.options).toBeUndefined();

			const found = getPresetById(preset.id!);
			expect(found?.name).toBe("Minimal Preset");
		});

		it("should handle updating name only without creating version", () => {
			const created = savePreset({
				name: "Original Name",
				taskType: "coding",
				options: { tone: "technical" },
			});

			const createdId = created.id!;

			const updated = savePreset({
				id: createdId,
				name: "New Name",
				taskType: "coding",
				options: { tone: "technical" }, // Same options
			});

			expect(updated.name).toBe("New Name");
			expect(updated.versions).toHaveLength(0); // No version created
		});

		it("should handle rapid sequential updates", () => {
			const created = savePreset({
				name: "Rapid Update Test",
				taskType: "general",
				options: { tone: "neutral" },
			});

			const createdId = created.id!;

			// Rapid updates
			for (let i = 0; i < 5; i++) {
				savePreset({
					id: createdId,
					name: "Rapid Update Test",
					taskType: "general",
					options: { tone: i % 2 === 0 ? "formal" : "friendly" },
				});
			}

			const final = getPresetById(createdId);
			expect(final?.versions?.length).toBeLessThanOrEqual(10); // Should respect MAX_VERSIONS
		});
	});
});
