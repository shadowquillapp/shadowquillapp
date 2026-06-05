import { beforeEach, describe, expect, it } from "vitest";
import {
	deletePresetByIdOrName,
	ensureDefaultPreset,
	getDefaultPresets,
	getPresetById,
	getPresets,
	savePreset,
} from "@/lib/presets";

describe("Preset Workflow Integration", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("complete preset lifecycle", () => {
		it("should handle create -> update -> delete flow", () => {
			const created = savePreset({
				name: "My Workflow Preset",
				taskType: "engineering",
				options: { tone: "technical", includeTests: true },
			});

			expect(created.id).toBeDefined();
			expect(created.createdAt).toBeDefined();
			expect(getPresets()).toHaveLength(1);

			const createdId = created.id ?? "";
			expect(createdId).toBeTruthy();

			const updated = savePreset({
				id: createdId,
				name: "My Workflow Preset",
				taskType: "engineering",
				options: { tone: "friendly", includeTests: true },
			});

			expect(updated.id).toBe(createdId);
			expect(updated.options?.tone).toBe("friendly");
			const createdAt = created.updatedAt ?? 0;
			expect(updated.updatedAt).toBeGreaterThanOrEqual(createdAt);

			deletePresetByIdOrName(createdId);
			expect(getPresets()).toHaveLength(0);
		});
	});

	describe("default presets initialization", () => {
		it("should initialize default presets on first run", () => {
			expect(getPresets()).toHaveLength(0);

			ensureDefaultPreset();

			const presets = getPresets();
			expect(presets.length).toBeGreaterThan(0);

			for (const preset of presets) {
				expect(preset.createdAt).toBeDefined();
			}
		});

		it("should not overwrite existing presets on second call", () => {
			const custom = savePreset({
				name: "My Custom Preset",
				taskType: "intent",
				options: { tone: "friendly" },
			});

			ensureDefaultPreset();

			const presets = getPresets();
			expect(presets).toHaveLength(1);
			expect(presets[0]?.id).toBe(custom.id);
		});

		it("should have all expected task types in defaults", () => {
			const defaults = getDefaultPresets();

			const taskTypes = new Set(defaults.map((p) => p.taskType));

			expect(taskTypes.has("intent")).toBe(true);
			expect(taskTypes.has("engineering")).toBe(true);
			expect(taskTypes.has("narrative")).toBe(true);
			expect(taskTypes.has("analysis")).toBe(true);
			expect(taskTypes.has("persuasion")).toBe(true);
		});
	});

	describe("preset lookup and filtering", () => {
		it("should find preset by ID after creation", () => {
			const preset1 = savePreset({
				name: "Preset One",
				taskType: "engineering",
			});

			const preset2 = savePreset({
				name: "Preset Two",
				taskType: "narrative",
			});

			const id1 = preset1.id ?? "";
			const id2 = preset2.id ?? "";
			expect(id1).toBeTruthy();
			expect(id2).toBeTruthy();

			const found1 = getPresetById(id1);
			const found2 = getPresetById(id2);

			expect(found1?.name).toBe("Preset One");
			expect(found2?.name).toBe("Preset Two");
		});

		it("should return undefined for non-existent ID", () => {
			savePreset({
				name: "Existing",
				taskType: "intent",
			});

			const found = getPresetById("non-existent-id");
			expect(found).toBeUndefined();
		});
	});

	describe("edge cases and error handling", () => {
		it("should handle preset with no options", () => {
			const preset = savePreset({
				name: "Minimal Preset",
				taskType: "intent",
			});

			expect(preset.id).toBeDefined();
			expect(preset.options).toBeUndefined();

			const id = preset.id ?? "";
			expect(id).toBeTruthy();

			const found = getPresetById(id);
			expect(found?.name).toBe("Minimal Preset");
		});

		it("should handle updating name only", () => {
			const created = savePreset({
				name: "Original Name",
				taskType: "engineering",
				options: { tone: "technical" },
			});

			const createdId = created.id ?? "";
			expect(createdId).toBeTruthy();

			const updated = savePreset({
				id: createdId,
				name: "New Name",
				taskType: "engineering",
				options: { tone: "technical" },
			});

			expect(updated.name).toBe("New Name");
		});

		it("should handle rapid sequential updates", () => {
			const created = savePreset({
				name: "Rapid Update Test",
				taskType: "intent",
				options: { tone: "neutral" },
			});

			const createdId = created.id ?? "";
			expect(createdId).toBeTruthy();

			for (let i = 0; i < 5; i++) {
				savePreset({
					id: createdId,
					name: "Rapid Update Test",
					taskType: "intent",
					options: { tone: i % 2 === 0 ? "formal" : "friendly" },
				});
			}

			const final = getPresetById(createdId);
			expect(final?.options?.tone).toBeDefined();
		});
	});
});
