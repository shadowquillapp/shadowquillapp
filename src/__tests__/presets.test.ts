import { beforeEach, describe, expect, it } from "vitest";
import {
	deletePresetByIdOrName,
	ensureDefaultPreset,
	getDefaultPresets,
	getPresetById,
	getPresets,
	type Preset,
	savePreset,
} from "@/lib/presets";

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
			name: "my preset",
			taskType: "coding",
			options: { tone: "friendly" },
		});

		expect(updated.id).toBe("test-1");
		expect(updated.taskType).toBe("coding");
		expect(updated.options?.tone).toBe("friendly");
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

	it("should keep all presets when neither id nor name is provided", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "general" },
			{ id: "test-2", name: "Second", taskType: "coding" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName(undefined, undefined);

		const remaining = getPresets();
		expect(remaining).toHaveLength(2);
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

	it("should add timestamps to default presets", () => {
		ensureDefaultPreset();

		const presets = getPresets();
		for (const preset of presets) {
			expect(preset.createdAt).toBeDefined();
			expect(preset.updatedAt).toBeDefined();
		}
	});
});
