import { describe, expect, it } from "vitest";
import { buildDirectives } from "@/lib/prompt-directives";
import {
	buildBaseDirectives,
	buildFormatDirectives,
} from "@/lib/prompt-directives/base";
import type { Detail, TaskType, Tone } from "@/types";

describe("buildDirectives", () => {
	it("should return empty array when no options provided", () => {
		const result = buildDirectives("intent", undefined);
		expect(result).toEqual([]);
	});

	it("should return empty array for empty options", () => {
		const result = buildDirectives("intent", {});
		expect(result).toEqual([]);
	});

	it("should include base directives", () => {
		const result = buildDirectives("intent", { tone: "friendly" });
		expect(result.some((d) => d.toLowerCase().includes("friendly"))).toBe(true);
	});

	it("should include format directives for markdown", () => {
		const result = buildDirectives("intent", { format: "markdown" });
		expect(result.some((d) => d.toLowerCase().includes("markdown"))).toBe(true);
	});

	it("should not add task-specific directives for any task type", () => {
		const result = buildDirectives("engineering", { tone: "technical" });
		expect(result.some((d) => d.toLowerCase().includes("technical"))).toBe(
			true,
		);
		expect(result.some((d) => d.toLowerCase().includes("test"))).toBe(false);
	});

	it("should filter out empty strings", () => {
		const result = buildDirectives("intent", { tone: "neutral" });
		expect(result.every((d) => d.length > 0)).toBe(true);
	});
});

describe("buildBaseDirectives", () => {
	it("should include tone directive", () => {
		const result = buildBaseDirectives({ tone: "formal" });
		expect(result.some((d) => d.toLowerCase().includes("formal"))).toBe(true);
	});

	it("should include output length requirement for detail level", () => {
		const result = buildBaseDirectives({ detail: "brief" });
		expect(
			result.some((d) => d.includes("75-150") && d.includes("OUTPUT LENGTH")),
		).toBe(true);
	});

	it("should include output length requirement for detailed level", () => {
		const result = buildBaseDirectives({ detail: "detailed" });
		expect(
			result.some((d) => d.includes("300-375") && d.includes("OUTPUT LENGTH")),
		).toBe(true);
	});

	it("should skip language directive for English", () => {
		const result = buildBaseDirectives({ language: "English" });
		expect(result.some((d) => d.toLowerCase().includes("english"))).toBe(false);
	});

	it("should include language directive for non-English", () => {
		const result = buildBaseDirectives({ language: "Spanish" });
		expect(result.some((d) => d.includes("Spanish"))).toBe(true);
	});

	it("should include audience directive", () => {
		const result = buildBaseDirectives({ audience: "developers" });
		expect(result.some((d) => d.includes("developers"))).toBe(true);
	});

	it("should include style guidelines", () => {
		const result = buildBaseDirectives({
			styleGuidelines: "Use active voice",
		});
		expect(result.some((d) => d.includes("active voice"))).toBe(true);
	});

	it("should use fallback for unknown tone", () => {
		const result = buildBaseDirectives({
			tone: "unknown-tone" as unknown as Tone,
		});
		expect(result.some((d) => d.includes("Use a unknown-tone tone."))).toBe(
			true,
		);
	});

	it("should skip unknown detail level", () => {
		const result = buildBaseDirectives({
			detail: "unknown-detail" as unknown as Detail,
		});
		expect(result.some((d) => d.includes("OUTPUT LENGTH"))).toBe(false);
	});
});

describe("buildFormatDirectives", () => {
	it("should include markdown directive", () => {
		const result = buildFormatDirectives("intent", { format: "markdown" });
		expect(result.some((d) => d.toLowerCase().includes("markdown"))).toBe(true);
	});

	it("should include XML schema when provided", () => {
		const result = buildFormatDirectives("intent", {
			format: "xml",
			outputXMLSchema: "<root><title/></root>",
		});
		expect(result.some((d) => d.includes("<title/>"))).toBe(true);
	});

	it("should include default XML schema for task type when not provided", () => {
		const result = buildFormatDirectives("engineering", { format: "xml" });
		expect(result.some((d) => d.includes("<engineering_task>"))).toBe(true);
	});

	it("should use general schema for unknown task type", () => {
		const result = buildFormatDirectives(
			"unknown-task" as unknown as TaskType,
			{
				format: "xml",
			},
		);
		expect(result.some((d) => d.includes("<prompt>"))).toBe(true);
	});

	it("should include plain text directive", () => {
		const result = buildFormatDirectives("intent", { format: "plain" });
		expect(result.some((d) => d.toLowerCase().includes("plain text"))).toBe(
			true,
		);
	});

	it("should use generic image XML schema without injected specs", () => {
		const result = buildFormatDirectives("visual", { format: "xml" });
		expect(result.some((d) => d.includes("<image_prompt>"))).toBe(true);
		expect(result.some((d) => d.includes('resolution="'))).toBe(false);
	});

	it("should use generic video XML schema without injected specs", () => {
		const result = buildFormatDirectives("motion", { format: "xml" });
		expect(result.some((d) => d.includes("<video_prompt>"))).toBe(true);
		expect(result.some((d) => d.includes('fps="'))).toBe(false);
	});
});
