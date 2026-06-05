import { beforeEach, describe, expect, it } from "vitest";
import {
	deletePresetByIdOrName,
	ensureDefaultPreset,
	getDefaultPresets,
	getPresetById,
	getPresets,
	migrateTaskType,
	type Preset,
	savePreset,
} from "@/lib/presets";

const clearStorage = () => {
	localStorage.clear();
};

describe("migrateTaskType", () => {
	it("should map legacy task types to new intent-domain names", () => {
		expect(migrateTaskType("general")).toBe("intent");
		expect(migrateTaskType("coding")).toBe("engineering");
		expect(migrateTaskType("writing")).toBe("narrative");
		expect(migrateTaskType("research")).toBe("analysis");
		expect(migrateTaskType("marketing")).toBe("persuasion");
		expect(migrateTaskType("image")).toBe("visual");
		expect(migrateTaskType("video")).toBe("motion");
	});

	it("should accept new task types unchanged", () => {
		expect(migrateTaskType("intent")).toBe("intent");
		expect(migrateTaskType("engineering")).toBe("engineering");
	});

	it("should return null for unknown task types", () => {
		expect(migrateTaskType("unknown")).toBeNull();
	});
});

describe("getPresets", () => {
	beforeEach(clearStorage);

	it("should migrate legacy task types on read", () => {
		localStorage.setItem(
			"PC_PRESETS",
			JSON.stringify([
				{ id: "legacy-1", name: "Legacy Coding", taskType: "coding" },
			]),
		);

		const presets = getPresets();
		expect(presets[0]?.taskType).toBe("engineering");
	});

	it("should return empty array when no presets exist", () => {
		const result = getPresets();
		expect(result).toEqual([]);
	});

	it("should return stored presets", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "Test Preset", taskType: "intent" },
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
		const preset: Preset = {
			id: "test-1",
			name: "Test",
			taskType: "engineering",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([preset]));

		const result = getPresetById("test-1");
		expect(result).toEqual(preset);
	});
});

describe("savePreset", () => {
	beforeEach(clearStorage);

	it("should create new preset with generated id", () => {
		const preset: Preset = { name: "New Preset", taskType: "narrative" };
		const saved = savePreset(preset);

		expect(saved.id).toBeDefined();
		expect(saved.id).toMatch(/^preset-\d+-/);
		expect(saved.name).toBe("New Preset");
		expect(saved.taskType).toBe("narrative");
		expect(saved.createdAt).toBeDefined();
		expect(saved.updatedAt).toBeDefined();
	});

	it("should update existing preset by id", () => {
		const initial: Preset = {
			id: "test-1",
			name: "Original",
			taskType: "intent",
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			id: "test-1",
			name: "Updated",
			taskType: "engineering",
		});

		expect(updated.id).toBe("test-1");
		expect(updated.name).toBe("Updated");
		expect(updated.taskType).toBe("engineering");

		const stored = getPresets();
		expect(stored).toHaveLength(1);
		expect(stored[0]?.name).toBe("Updated");
	});

	it("should strip legacy type-specific options on save", () => {
		const saved = savePreset({
			name: "Legacy Options",
			taskType: "visual",
			options: {
				tone: "neutral",
				stylePreset: "photorealistic",
				aspectRatio: "16:9",
				includeTests: true,
			} as Preset["options"],
		});

		expect(saved.options?.tone).toBe("neutral");
		expect(saved.options).not.toHaveProperty("stylePreset");
		expect(saved.options).not.toHaveProperty("aspectRatio");
		expect(saved.options).not.toHaveProperty("includeTests");
	});

	it("should update existing preset by name (case-insensitive)", () => {
		const initial: Preset = {
			id: "test-1",
			name: "My Preset",
			taskType: "intent",
			options: { tone: "formal" },
			createdAt: 1000,
			updatedAt: 1000,
		};
		localStorage.setItem("PC_PRESETS", JSON.stringify([initial]));

		const updated = savePreset({
			name: "my preset",
			taskType: "engineering",
			options: { tone: "friendly" },
		});

		expect(updated.id).toBe("test-1");
		expect(updated.taskType).toBe("engineering");
		expect(updated.options?.tone).toBe("friendly");
	});
});

describe("deletePresetByIdOrName", () => {
	beforeEach(clearStorage);

	it("should delete preset by id", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "intent" },
			{ id: "test-2", name: "Second", taskType: "engineering" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName("test-1");

		const remaining = getPresets();
		expect(remaining).toHaveLength(1);
		expect(remaining[0]?.id).toBe("test-2");
	});

	it("should delete preset by name", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "intent" },
			{ id: "test-2", name: "Second", taskType: "engineering" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName(undefined, "First");

		const remaining = getPresets();
		expect(remaining).toHaveLength(1);
		expect(remaining[0]?.name).toBe("Second");
	});

	it("should handle non-existent preset gracefully", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "intent" },
		];
		localStorage.setItem("PC_PRESETS", JSON.stringify(presets));

		deletePresetByIdOrName("non-existent");

		const remaining = getPresets();
		expect(remaining).toHaveLength(1);
	});

	it("should keep all presets when neither id nor name is provided", () => {
		const presets: Preset[] = [
			{ id: "test-1", name: "First", taskType: "intent" },
			{ id: "test-2", name: "Second", taskType: "engineering" },
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

		expect(taskTypes.has("intent")).toBe(true);
		expect(taskTypes.has("engineering")).toBe(true);
		expect(taskTypes.has("narrative")).toBe(true);
		expect(taskTypes.has("analysis")).toBe(true);
		expect(taskTypes.has("persuasion")).toBe(true);
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
			taskType: "intent",
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
