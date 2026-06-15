import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildRefinementPrompt,
	buildUnifiedPrompt,
	validateBuilderInput,
} from "@/lib/prompt-builder-client";

describe("buildUnifiedPrompt", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("rejects empty input", () => {
		expect(() =>
			buildUnifiedPrompt({
				input: "",
				taskType: "intent",
			}),
		).toThrow("Empty input. Please provide content to work with.");
	});

	it("rejects whitespace-only input", () => {
		expect(() =>
			buildUnifiedPrompt({
				input: "   ",
				taskType: "intent",
			}),
		).toThrow("Empty input. Please provide content to work with.");
	});

	it("builds a prompt for valid input", () => {
		const result = buildUnifiedPrompt({
			input: "Write a haiku about code",
			taskType: "intent",
		});
		expect(result).toContain("Write a haiku about code");
		expect(result).toContain("intent");
	});

	it("includes generation options in output", () => {
		const result = buildUnifiedPrompt({
			input: "Design a button",
			taskType: "visual",
			options: { tone: "formal", detail: "detailed", format: "markdown" },
		});
		expect(result).toContain("Design a button");
		expect(result).toContain("formal");
	});
});

describe("buildRefinementPrompt", () => {
	it("rejects empty refinement request", () => {
		expect(() =>
			buildRefinementPrompt({
				previousOutput: "Previous output",
				refinementRequest: "   ",
				taskType: "intent",
			}),
		).toThrow("Please provide a refinement request");
	});

	it("builds refinement prompt", () => {
		const result = buildRefinementPrompt({
			previousOutput: "Original compiled prompt",
			refinementRequest: "Make it shorter",
			taskType: "engineering",
		});
		expect(result).toContain("Original compiled prompt");
		expect(result).toContain("Make it shorter");
	});
});

describe("validateBuilderInput", () => {
	it("returns error message for empty input", () => {
		expect(validateBuilderInput("", "intent")).toBe(
			"Empty input. Please provide content to work with.",
		);
	});
});
