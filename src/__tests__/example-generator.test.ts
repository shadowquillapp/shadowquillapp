import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PresetLite, TaskType } from "@/types";

// We need to test the module's internal pure functions
// Since they're not exported, we'll test them through the exported functions
// or by dynamically importing the module

// Mock the model-client to prevent actual API calls
vi.mock("@/lib/model-client", () => ({
	callLocalModelClient: vi.fn(),
}));

vi.mock("@/lib/prompt-builder-client", () => ({
	buildPromptPreview: vi.fn(),
}));

import {
	generatePresetExamples,
	generateSingleExample,
} from "@/lib/example-generator";
import { callLocalModelClient } from "@/lib/model-client";
import { buildPromptPreview } from "@/lib/prompt-builder-client";

const mockCallLocalModelClient = vi.mocked(callLocalModelClient);
const mockBuildPromptPreview = vi.mocked(buildPromptPreview);

describe("example-generator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("generatePresetExamples", () => {
		it("should generate two examples for a preset", async () => {
			const preset: PresetLite = {
				id: "test-1",
				name: "Test Preset",
				taskType: "general",
				options: { tone: "friendly" },
			};

			// Mock the input generation
			mockCallLocalModelClient.mockResolvedValueOnce(
				"First example input about productivity\n---SPLIT---\nSecond example about organization",
			);

			// Mock the output generation for each input
			mockBuildPromptPreview.mockResolvedValue("Enhanced prompt content");
			mockCallLocalModelClient.mockResolvedValueOnce("Generated output 1");
			mockCallLocalModelClient.mockResolvedValueOnce("Generated output 2");

			const [example1, example2] = await generatePresetExamples(preset);

			expect(example1).toHaveProperty("input");
			expect(example1).toHaveProperty("output");
			expect(example1).toHaveProperty("generatedAt");
			expect(example2).toHaveProperty("input");
			expect(example2).toHaveProperty("output");
		});

		it("should use fallback examples when AI fails to generate", async () => {
			const preset: PresetLite = {
				name: "Coding Preset",
				taskType: "coding",
			};

			// Mock failed input generation (returns unparseable response)
			mockCallLocalModelClient.mockResolvedValueOnce("Invalid response without delimiter");

			// Mock the output generation
			mockBuildPromptPreview.mockResolvedValue("Enhanced prompt");
			mockCallLocalModelClient.mockResolvedValue("Generated output");

			const [example1, example2] = await generatePresetExamples(preset);

			// Should use fallback examples for coding task type
			expect(example1.input).toBeDefined();
			expect(example2.input).toBeDefined();
		});

		it("should handle different task types", async () => {
			const taskTypes: TaskType[] = [
				"general",
				"coding",
				"image",
				"video",
				"research",
				"writing",
				"marketing",
			];

			for (const taskType of taskTypes) {
				const preset: PresetLite = {
					name: `${taskType} preset`,
					taskType,
				};

				mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
				mockBuildPromptPreview.mockResolvedValue("Enhanced");
				mockCallLocalModelClient.mockResolvedValue("Output");

				const result = await generatePresetExamples(preset);

				expect(result).toHaveLength(2);
				expect(result[0]).toHaveProperty("input");
				expect(result[1]).toHaveProperty("input");
			}
		});

		it("should include timestamp in examples", async () => {
			const preset: PresetLite = {
				name: "Test",
				taskType: "general",
			};

			const before = Date.now();

			mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			const [example1, example2] = await generatePresetExamples(preset);

			const after = Date.now();

			expect(example1.generatedAt).toBeGreaterThanOrEqual(before);
			expect(example1.generatedAt).toBeLessThanOrEqual(after);
			expect(example2.generatedAt).toBeGreaterThanOrEqual(before);
		});
	});

	describe("generateSingleExample", () => {
		it("should generate a single example", async () => {
			const preset: PresetLite = {
				name: "Single Test",
				taskType: "writing",
			};

			mockCallLocalModelClient.mockResolvedValueOnce("Write an engaging blog post about AI");
			mockBuildPromptPreview.mockResolvedValue("Enhanced writing prompt");
			mockCallLocalModelClient.mockResolvedValueOnce("Generated writing output");

			const example = await generateSingleExample(preset);

			expect(example.input).toBeDefined();
			expect(example.output).toBeDefined();
			expect(example.generatedAt).toBeDefined();
		});

		it("should use fallback on generation failure", async () => {
			const preset: PresetLite = {
				name: "Fallback Test",
				taskType: "image",
			};

			// Simulate failure in input generation
			mockCallLocalModelClient.mockRejectedValueOnce(new Error("API error"));
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValueOnce("Generated output");

			const example = await generateSingleExample(preset);

			// Should use fallback input for image type
			expect(example.input).toBeDefined();
			expect(example.input.length).toBeGreaterThan(0);
		});

		it("should use fallback for empty response", async () => {
			const preset: PresetLite = {
				name: "Empty Response Test",
				taskType: "research",
			};

			// Return empty/whitespace response
			mockCallLocalModelClient.mockResolvedValueOnce("   ");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValueOnce("Output");

			const example = await generateSingleExample(preset);

			// Should use fallback
			expect(example.input).toBeDefined();
			expect(example.input.trim().length).toBeGreaterThan(0);
		});
	});

	describe("parseExampleInputs (tested indirectly)", () => {
		it("should parse ---SPLIT--- delimiter correctly", async () => {
			const preset: PresetLite = {
				name: "Parse Test",
				taskType: "general",
			};

			mockCallLocalModelClient.mockResolvedValueOnce(
				"First example about productivity tips\n---SPLIT---\nSecond example about time management",
			);
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			const [example1, example2] = await generatePresetExamples(preset);

			expect(example1.input).toContain("productivity");
			expect(example2.input).toContain("time management");
		});

		it("should handle numbered format fallback", async () => {
			const preset: PresetLite = {
				name: "Numbered Parse Test",
				taskType: "general",
			};

			// Numbered format without ---SPLIT---
			mockCallLocalModelClient.mockResolvedValueOnce(
				"1. First numbered example\n2. Second numbered example",
			);
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			const [example1, example2] = await generatePresetExamples(preset);

			expect(example1.input).toBeDefined();
			expect(example2.input).toBeDefined();
		});

		it("should handle paragraph fallback", async () => {
			const preset: PresetLite = {
				name: "Paragraph Parse Test",
				taskType: "general",
			};

			// Double-newline separated paragraphs
			mockCallLocalModelClient.mockResolvedValueOnce(
				"First paragraph example content here.\n\nSecond paragraph example content here.",
			);
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			const [example1, example2] = await generatePresetExamples(preset);

			expect(example1.input).toContain("First paragraph");
			expect(example2.input).toContain("Second paragraph");
		});
	});

	describe("directive building", () => {
		it("should include tone in prompt context", async () => {
			const preset: PresetLite = {
				name: "Tone Test",
				taskType: "general",
				options: { tone: "formal" },
			};

			mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			await generatePresetExamples(preset);

			// Check that the first call (input generation) included tone info
			const firstCallArgs = mockCallLocalModelClient.mock.calls[0];
			expect(firstCallArgs?.[0]).toContain("formal");
		});

		it("should include task-specific options for coding", async () => {
			const preset: PresetLite = {
				name: "Coding Options Test",
				taskType: "coding",
				options: {
					includeTests: true,
					techStack: "React, TypeScript",
				},
			};

			mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			await generatePresetExamples(preset);

			const firstCallArgs = mockCallLocalModelClient.mock.calls[0];
			expect(firstCallArgs?.[0]).toContain("test");
			expect(firstCallArgs?.[0]).toContain("React");
		});

		it("should include writing-specific options", async () => {
			const preset: PresetLite = {
				name: "Writing Options Test",
				taskType: "writing",
				options: {
					writingStyle: "narrative",
					targetWordCount: 1500,
				},
			};

			mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			await generatePresetExamples(preset);

			const firstCallArgs = mockCallLocalModelClient.mock.calls[0];
			expect(firstCallArgs?.[0]).toContain("narrative");
			expect(firstCallArgs?.[0]).toContain("1500");
		});

		it("should include image-specific options", async () => {
			const preset: PresetLite = {
				name: "Image Options Test",
				taskType: "image",
				options: {
					stylePreset: "photorealistic",
					aspectRatio: "16:9",
				},
			};

			mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			await generatePresetExamples(preset);

			const firstCallArgs = mockCallLocalModelClient.mock.calls[0];
			expect(firstCallArgs?.[0]).toContain("photorealistic");
			expect(firstCallArgs?.[0]).toContain("16:9");
		});

		it("should include video-specific options", async () => {
			const preset: PresetLite = {
				name: "Video Options Test",
				taskType: "video",
				options: {
					cameraMovement: "dolly",
					frameRate: 60,
					durationSeconds: 15,
				},
			};

			mockCallLocalModelClient.mockResolvedValueOnce("Input 1\n---SPLIT---\nInput 2");
			mockBuildPromptPreview.mockResolvedValue("Enhanced");
			mockCallLocalModelClient.mockResolvedValue("Output");

			await generatePresetExamples(preset);

			const firstCallArgs = mockCallLocalModelClient.mock.calls[0];
			expect(firstCallArgs?.[0]).toContain("dolly");
			expect(firstCallArgs?.[0]).toContain("60");
			expect(firstCallArgs?.[0]).toContain("15");
		});
	});

	describe("fallback examples", () => {
		const taskTypes: TaskType[] = [
			"general",
			"coding",
			"image",
			"video",
			"research",
			"writing",
			"marketing",
		];

		for (const taskType of taskTypes) {
			it(`should have valid fallback examples for ${taskType}`, async () => {
				const preset: PresetLite = {
					name: `${taskType} fallback test`,
					taskType,
				};

				// Force fallback by returning unparseable response
				mockCallLocalModelClient.mockResolvedValueOnce("single line only");
				mockBuildPromptPreview.mockResolvedValue("Enhanced");
				mockCallLocalModelClient.mockResolvedValue("Output");

				const [example1, example2] = await generatePresetExamples(preset);

				// Fallback examples should be non-empty strings
				expect(typeof example1.input).toBe("string");
				expect(typeof example2.input).toBe("string");
				expect(example1.input.length).toBeGreaterThan(10);
				expect(example2.input.length).toBeGreaterThan(10);
			});
		}
	});
});

