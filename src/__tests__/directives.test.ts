import { describe, expect, it } from "vitest";
import {
	buildBaseDirectives,
	buildDirectives,
	buildFormatDirectives,
} from "@/lib/prompt-directives/base";
import type { Detail, Tone } from "@/types";

describe("buildDirectives", () => {
	it("should return empty array when no options provided", () => {
		expect(buildDirectives(undefined)).toEqual([]);
	});

	it("should return empty array for empty options", () => {
		expect(buildDirectives({})).toEqual([]);
	});

	it("should include base directives", () => {
		const result = buildDirectives({ tone: "friendly" });
		expect(result.some((d) => d.toLowerCase().includes("friendly"))).toBe(true);
	});

	it("should include format directives for markdown", () => {
		const result = buildDirectives({ format: "markdown" });
		expect(result.some((d) => d.toLowerCase().includes("markdown"))).toBe(true);
	});

	it("should filter out empty strings", () => {
		const result = buildDirectives({ tone: "neutral" });
		expect(result.every((d) => d.length > 0)).toBe(true);
	});
});

describe("buildBaseDirectives", () => {
	it("should include tone directive", () => {
		const result = buildBaseDirectives({ tone: "formal" });
		expect(result.some((d) => d.toLowerCase().includes("formal"))).toBe(true);
	});

	it("should include output length requirement for normal level", () => {
		const result = buildBaseDirectives({ detail: "normal" });
		expect(
			result.some((d) => d.includes("75-150") && d.includes("OUTPUT LENGTH")),
		).toBe(true);
	});

	it("should include output length requirement for detailed level", () => {
		const result = buildBaseDirectives({ detail: "detailed" });
		expect(
			result.some((d) => d.includes("200-250") && d.includes("OUTPUT LENGTH")),
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
		const result = buildFormatDirectives({ format: "markdown" });
		expect(result.some((d) => d.toLowerCase().includes("markdown"))).toBe(true);
	});

	it("should include plain text directive", () => {
		const result = buildFormatDirectives({ format: "plain" });
		expect(result.some((d) => d.toLowerCase().includes("plain text"))).toBe(
			true,
		);
	});

	it("should stay empty for xml format (compiler records format as constraint)", () => {
		expect(buildFormatDirectives({ format: "xml" })).toEqual([]);
	});
});
