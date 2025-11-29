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
import type { VersionedPreset } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Helper to clear localStorage before each test
const clearStorage = () => {
	localStorage.clear();
};

describe("getPresets", () => {
	beforeEach(clearStorage);

	it("should return empty array when no presets exist", () => {
		const result = getPresets();
		expect(result).toEqual([]);
	});

	it("should return stored presets", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "Test Preset", taskType: "general" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		const result = getPresets();
		expect(result).toEqual(presets);
	});

	it("should handle invalid JSON gracefully", () => {
		localStorage.setItem("PC_PRESETS", "invalid json");
		const result = getPresets();
		expect(result).toEqual([]);
	});
});

describe("getPresetById", () => {
	beforeEach(clearStorage);

	it("should return undefined when preset not found", () => {
		const result = getPresetById("non-existent");
		expect(result).toBeUndefined();
	});

	it("should return preset when found", () => {
		const preset: Preset = { id: "test-1", name: "Test", taskType: "coding" };
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = getPresetById("test-1");
		expect(result).toEqual(preset);
	});
});

describe("getPresetHistory", () => {
	beforeEach(clearStorage);

	it("should return empty array when preset has no versions", () => {
		const preset: Preset = { id: "test-1", name: "Test", taskType: "general" };
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = getPresetHistory("test-1");
		expect(result).toEqual([]);
	});

	it("should return versions when preset has history", () => {
		const versions = [
			{
				version: 2,
				timestamp: 2000,
				taskType: "general" as const,
				options: {},
			},
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: {},
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			versions,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = getPresetHistory("test-1");
		expect(result).toEqual(versions);
	});

	it("should return empty array for non-existent preset", () => {
		const result = getPresetHistory("non-existent");
		expect(result).toEqual([]);
	});
});

describe("savePreset", () => {
	beforeEach(clearStorage);

	it("should create new preset with generated id", () => {
		const preset: Preset = { name: "New Preset", taskType: "writing" };
		const saved = savePreset(preset);

		expect(saved.id).toBeDefined();
		expect(saved.id).toMatch(/^preset-\d+-/);
		expect(saved.name).toBe("New Preset");
		expect(saved.taskType).toBe("writing");
		expect(saved.createdAt).toBeDefined();
		expect(saved.updatedAt).toBeDefined();
	});

	it("should update existing preset by id", () => {
		const initial: Preset = {
			id: "test-1",
			name: "Original",
			taskType: "general",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			id: "test-1",
			name: "Updated",
			taskType: "coding",
		});

		expect(updated.id).toBe("test-1");
		expect(updated.name).toBe("Updated");
		expect(updated.taskType).toBe("coding");

		const stored = getPresets();
		expect(stored).toHaveLength(1);
		expect(stored[0]?.name).toBe("Updated");
	});

	it("should update existing preset by name (case-insensitive)", () => {
		const initial: Preset = {
			id: "test-1",
			name: "My Preset",
			taskType: "general",
			options: { tone: "formal" },
			createdAt: 1000,
			updatedAt: 1000,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			name: "my preset", // different case
			taskType: "coding",
			options: { tone: "friendly" },
		});

		expect(updated.id).toBe("test-1"); // Should keep existing id
		expect(updated.taskType).toBe("coding");
		expect(updated.options?.tone).toBe("friendly");
	});

	it("should create version entry when options change", () => {
		const initial: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "formal" },
			versions: [],
			currentVersion: 0,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "friendly" },
		});

		expect(updated.versions).toHaveLength(1);
		expect(updated.versions?.[0]?.options.tone).toBe("formal"); // Old value
		expect(updated.currentVersion).toBe(1);
	});

	it("should not create version entry when options unchanged", () => {
		const initial: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "formal" },
			versions: [],
			currentVersion: 0,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			id: "test-1",
			name: "Updated Name",
			taskType: "general",
			options: { tone: "formal" }, // Same options
		});

		expect(updated.versions).toHaveLength(0);
		expect(updated.currentVersion).toBe(0);
	});

	it("should limit versions to MAX_VERSIONS (10)", () => {
		const versions = Array.from({ length: 10 }, (_, i) => ({
			version: i + 1,
			timestamp: i * 1000,
			taskType: "general" as const,
			options: { tone: "formal" as const },
		}));

		const initial: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "formal" },
			versions,
			currentVersion: 10,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "friendly" }, // Change options to trigger version
		});

		expect(updated.versions?.length).toBeLessThanOrEqual(10);
	});

	it("should include changelog in version when provided", () => {
		const initial: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "formal" },
			versions: [],
			currentVersion: 0,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset(
			{
				id: "test-1",
				name: "Test",
				taskType: "general",
				options: { tone: "friendly" },
			},
			"Changed tone to friendly",
		);

		expect(updated.versions?.[0]?.changelog).toBe("Changed tone to friendly");
	});
});

describe("deletePresetByIdOrName", () => {
	beforeEach(clearStorage);

	it("should delete preset by id", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "general" },
			{ id: "test-2", name: "Second", taskType: "coding" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName("test-1");

		const remaining = getPresets();
		expect(remaining).toHaveLength(1);
		expect(remaining[0]?.id).toBe("test-2");
	});

	it("should delete preset by name", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "general" },
			{ id: "test-2", name: "Second", taskType: "coding" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName(undefined, "First");

		const remaining = getPresets();
		expect(remaining).toHaveLength(1);
		expect(remaining[0]?.name).toBe("Second");
	});

	it("should handle non-existent preset gracefully", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "general" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName("non-existent");

		const remaining = getPresets();
		expect(remaining).toHaveLength(1);
	});
});

describe("rollbackPreset", () => {
	beforeEach(clearStorage);

	it("should rollback to specified version", () => {
		const versions = [
			{
				version: 2,
				timestamp: 2000,
				taskType: "coding" as const,
				options: { tone: "technical" as const },
			},
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: { tone: "formal" as const },
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "coding",
			options: { tone: "technical" },
			versions,
			currentVersion: 2,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = rollbackPreset("test-1", 1);

		expect(result).not.toBeNull();
		expect(result?.taskType).toBe("general");
		expect(result?.options?.tone).toBe("formal");
		expect(result?.currentVersion).toBe(3); // New version created
	});

	it("should return null for non-existent preset", () => {
		const result = rollbackPreset("non-existent", 1);
		expect(result).toBeNull();
	});

	it("should return null for non-existent version", () => {
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			versions: [],
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = rollbackPreset("test-1", 99);
		expect(result).toBeNull();
	});

	it("should include rollback changelog in new version", () => {
		const versions = [
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: { tone: "formal" as const },
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "coding",
			options: { tone: "technical" },
			versions,
			currentVersion: 1,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = rollbackPreset("test-1", 1);

		expect(result?.versions?.[0]?.changelog).toContain(
			"Rolled back to version 1",
		);
	});
});

describe("compareVersions", () => {
	beforeEach(clearStorage);

	it("should identify changed options", () => {
		const versions = [
			{
				version: 2,
				timestamp: 2000,
				taskType: "general" as const,
				options: { tone: "friendly" as const, detail: "brief" as const },
			},
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: { tone: "formal" as const, detail: "brief" as const },
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			versions,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = compareVersions("test-1", 1, 2);

		expect(result?.changed).toContain("tone");
		expect(result?.changed).not.toContain("detail");
	});

	it("should identify added options", () => {
		const versions = [
			{
				version: 2,
				timestamp: 2000,
				taskType: "general" as const,
				options: { tone: "formal" as const, detail: "brief" as const },
			},
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: { tone: "formal" as const },
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			versions,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = compareVersions("test-1", 1, 2);

		expect(result?.added).toContain("detail");
	});

	it("should identify removed options", () => {
		const versions = [
			{
				version: 2,
				timestamp: 2000,
				taskType: "general" as const,
				options: { tone: "formal" as const },
			},
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: { tone: "formal" as const, detail: "brief" as const },
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			versions,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = compareVersions("test-1", 1, 2);

		expect(result?.removed).toContain("detail");
	});

	it("should return null for non-existent preset", () => {
		const result = compareVersions("non-existent", 1, 2);
		expect(result).toBeNull();
	});

	it("should return null for non-existent versions", () => {
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			versions: [
				{ version: 1, timestamp: 1000, taskType: "general", options: {} },
			],
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = compareVersions("test-1", 1, 99);
		expect(result).toBeNull();
	});
});

describe("getDefaultPresets", () => {
	it("should return array of default presets", () => {
		const defaults = getDefaultPresets();

		expect(Array.isArray(defaults)).toBe(true);
		expect(defaults.length).toBeGreaterThan(0);
	});

	it("should have required properties on all presets", () => {
		const defaults = getDefaultPresets();

		for (const preset of defaults) {
			expect(preset.id).toBeDefined();
			expect(preset.name).toBeDefined();
			expect(preset.taskType).toBeDefined();
		}
	});

	it("should include presets for multiple task types", () => {
	const defaults = getDefaultPresets();
	const taskTypes = new Set(defaults.map((p) => p.taskType));

	expect(taskTypes.has("general")).toBe(true);
	expect(taskTypes.has("coding")).toBe(true);
	expect(taskTypes.has("writing")).toBe(true);
	expect(taskTypes.has("research")).toBe(true);
	expect(taskTypes.has("marketing")).toBe(true);
});
});

describe("ensureDefaultPreset", () => {
	beforeEach(clearStorage);

	it("should create default presets when storage is empty", () => {
		ensureDefaultPreset();

		const presets = getPresets();
		expect(presets.length).toBeGreaterThan(0);
	});

	it("should not overwrite existing presets", () => {
		const customPreset: Preset = {
			id: "custom-1",
			name: "My Custom",
			taskType: "general",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([customPreset]));

		ensureDefaultPreset();

		const presets = getPresets();
		expect(presets).toHaveLength(1);
		expect(presets[0]?.id).toBe("custom-1");
	});

	it("should add version metadata to default presets", () => {
		ensureDefaultPreset();

		const presets = getPresets();
		for (const preset of presets) {
			expect(preset.versions).toEqual([]);
			expect(preset.currentVersion).toBe(0);
			expect(preset.createdAt).toBeDefined();
			expect(preset.updatedAt).toBeDefined();
		}
	});
});

describe("exportPresetWithHistory", () => {
	beforeEach(clearStorage);

	it("should export preset with all metadata", () => {
		const versions = [
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: { tone: "formal" as const },
			},
		];
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
			options: { tone: "friendly" },
			versions,
			currentVersion: 1,
			createdAt: 1000,
			updatedAt: 2000,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const exported = exportPresetWithHistory("test-1");

		expect(exported).not.toBeNull();
		expect(exported?.id).toBe("test-1");
		expect(exported?.name).toBe("Test");
		expect(exported?.versions).toEqual(versions);
		expect(exported?.currentVersion).toBe(1);
	});

	it("should return null for non-existent preset", () => {
		const exported = exportPresetWithHistory("non-existent");
		expect(exported).toBeNull();
	});

	it("should exclude undefined properties", () => {
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "general",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const exported = exportPresetWithHistory("test-1");

		expect(exported).not.toBeNull();
		expect(Object.prototype.hasOwnProperty.call(exported, "options")).toBe(
			false,
		);
		expect(Object.prototype.hasOwnProperty.call(exported, "versions")).toBe(
			false,
		);
	});
});

describe("importPresetWithHistory", () => {
	beforeEach(clearStorage);

	it("should import preset with new id", () => {
		const presetData: VersionedPreset = {
			name: "Imported",
			taskType: "writing",
			options: { tone: "friendly" },
		};

		const imported = importPresetWithHistory(presetData);

		expect(imported.id).toBeDefined();
		expect(imported.id).toMatch(/^preset-/);
		expect(imported.name).toBe("Imported");
		expect(imported.createdAt).toBeDefined();
	});

	it("should overwrite existing preset when id matches and overwrite enabled", () => {
		const existing: Preset = {
			id: "test-1",
			name: "Original",
			taskType: "general",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([existing]));

		const presetData: VersionedPreset = {
			id: "test-1",
			name: "Updated Import",
			taskType: "coding",
		};

		const imported = importPresetWithHistory(presetData, { overwrite: true });

		expect(imported.id).toBe("test-1");
		expect(imported.name).toBe("Updated Import");

		const stored = getPresets();
		expect(stored).toHaveLength(1);
	});

	it("should create new preset when overwrite is false", () => {
		const existing: Preset = {
			id: "test-1",
			name: "Original",
			taskType: "general",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([existing]));

		const presetData: VersionedPreset = {
			id: "test-1",
			name: "New Import",
			taskType: "coding",
		};

		const imported = importPresetWithHistory(presetData, { overwrite: false });

		expect(imported.id).not.toBe("test-1");
		expect(imported.name).toBe("New Import");

		const stored = getPresets();
		expect(stored).toHaveLength(2);
	});

	it("should preserve version history on import", () => {
		const versions = [
			{
				version: 1,
				timestamp: 1000,
				taskType: "general" as const,
				options: {},
			},
		];
		const presetData: VersionedPreset = {
			name: "With History",
			taskType: "general",
			versions,
			currentVersion: 1,
		};

		const imported = importPresetWithHistory(presetData);

		expect(imported.versions).toEqual(versions);
		expect(imported.currentVersion).toBe(1);
	});
});
