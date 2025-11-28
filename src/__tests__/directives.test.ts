import { describe, expect, it } from "vitest";
import { buildDirectives } from "@/lib/prompt-directives";
import {
	buildAdvancedDirectives,
	buildBaseDirectives,
	buildFormatDirectives,
} from "@/lib/prompt-directives/base";
import { buildCodingDirectives } from "@/lib/prompt-directives/coding";
import { buildImageDirectives } from "@/lib/prompt-directives/image";
import { buildVideoDirectives } from "@/lib/prompt-directives/video";
import { buildWritingDirectives } from "@/lib/prompt-directives/writing";
import { buildResearchDirectives } from "@/lib/prompt-directives/research";
import { buildMarketingDirectives } from "@/lib/prompt-directives/marketing";

describe("buildDirectives", () => {
	it("should return empty array when no options provided", () => {
		const result = buildDirectives("general", undefined);
		expect(result).toEqual([]);
	});

	it("should return empty array for empty options", () => {
		const result = buildDirectives("general", {});
		expect(result).toEqual([]);
	});

	it("should include base directives", () => {
		const result = buildDirectives("general", { tone: "friendly" });
		expect(result.some((d) => d.toLowerCase().includes("friendly"))).toBe(true);
	});

	it("should include format directives for markdown", () => {
		const result = buildDirectives("general", { format: "markdown" });
		expect(result.some((d) => d.toLowerCase().includes("markdown"))).toBe(true);
	});

	it("should include task-specific directives for coding", () => {
		const result = buildDirectives("coding", { includeTests: true });
		expect(result.some((d) => d.toLowerCase().includes("test"))).toBe(true);
	});

	it("should filter out empty strings", () => {
		const result = buildDirectives("general", { tone: "neutral" });
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
		expect(result.some((d) => d.includes("75-150") && d.includes("OUTPUT LENGTH"))).toBe(true);
	});

	it("should include output length requirement for detailed level", () => {
		const result = buildBaseDirectives({ detail: "detailed" });
		expect(result.some((d) => d.includes("350-500") && d.includes("OUTPUT LENGTH"))).toBe(true);
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
});

describe("buildFormatDirectives", () => {
	it("should include markdown directive", () => {
		const result = buildFormatDirectives("general", { format: "markdown" });
		expect(result.some((d) => d.toLowerCase().includes("markdown"))).toBe(true);
	});

	it("should include XML schema when provided", () => {
		const result = buildFormatDirectives("general", {
			format: "xml",
			outputXMLSchema: "<root><title/></root>",
		});
		expect(result.some((d) => d.includes("<title/>"))).toBe(true);
	});

	it("should include default XML schema for task type when not provided", () => {
		const result = buildFormatDirectives("coding", { format: "xml" });
		expect(result.some((d) => d.includes("<coding_task>"))).toBe(true);
	});

	it("should include plain text directive", () => {
		const result = buildFormatDirectives("general", { format: "plain" });
		expect(result.some((d) => d.toLowerCase().includes("plain text"))).toBe(
			true,
		);
	});

	it("should inject resolution and aspect ratio into image XML schema", () => {
		const result = buildFormatDirectives("image", {
			format: "xml",
			targetResolution: "1080p",
			aspectRatio: "16:9",
		});
		expect(result.some((d) => d.includes('resolution="1080p"'))).toBe(true);
		expect(result.some((d) => d.includes('aspect="16:9"'))).toBe(true);
	});

	it("should inject specs into video XML schema", () => {
		const result = buildFormatDirectives("video", {
			format: "xml",
			targetResolution: "4K",
			aspectRatio: "9:16",
			frameRate: 60,
			durationSeconds: 15,
		});
		expect(result.some((d) => d.includes('resolution="4K"'))).toBe(true);
		expect(result.some((d) => d.includes('fps="60"'))).toBe(true);
		expect(result.some((d) => d.includes('duration="15s"'))).toBe(true);
	});
});

describe("buildAdvancedDirectives", () => {
	it("should include verification directive when enabled", () => {
		const result = buildAdvancedDirectives({ includeVerification: true });
		expect(result.some((d) => d.toLowerCase().includes("validation"))).toBe(
			true,
		);
	});

	it("should skip verification directive when disabled", () => {
		const result = buildAdvancedDirectives({ includeVerification: false });
		expect(result.some((d) => d.toLowerCase().includes("validation"))).toBe(
			false,
		);
	});

	it("should include CoT reasoning style", () => {
		const result = buildAdvancedDirectives({ reasoningStyle: "cot" });
		expect(result.some((d) => d.toLowerCase().includes("systematically"))).toBe(
			true,
		);
	});

	it("should include plan_then_solve reasoning style", () => {
		const result = buildAdvancedDirectives({
			reasoningStyle: "plan_then_solve",
		});
		expect(result.some((d) => d.toLowerCase().includes("plan"))).toBe(true);
	});

	it("should include tree_of_thought reasoning style", () => {
		const result = buildAdvancedDirectives({
			reasoningStyle: "tree_of_thought",
		});
		expect(result.some((d) => d.toLowerCase().includes("multiple"))).toBe(true);
	});

	it("should skip reasoning directive for none", () => {
		const result = buildAdvancedDirectives({ reasoningStyle: "none" });
		expect(result.length).toBe(0);
	});

	it("should include end of prompt token", () => {
		const result = buildAdvancedDirectives({
			endOfPromptToken: "<|endofprompt|>",
		});
		expect(result.some((d) => d.includes("<|endofprompt|>"))).toBe(true);
	});
});

describe("buildCodingDirectives", () => {
	it("should include test requirements when enabled", () => {
		const result = buildCodingDirectives({ includeTests: true });
		expect(result.some((d) => d.toLowerCase().includes("test"))).toBe(true);
	});

	it("should indicate no tests when disabled", () => {
		const result = buildCodingDirectives({ includeTests: false });
		expect(result.some((d) => d.toLowerCase().includes("no testing"))).toBe(
			true,
		);
	});

	it("should include tech stack", () => {
		const result = buildCodingDirectives({ techStack: "React, TypeScript" });
		expect(result.some((d) => d.includes("React, TypeScript"))).toBe(true);
	});

	it("should include project context", () => {
		const result = buildCodingDirectives({
			projectContext: "E-commerce platform",
		});
		expect(result.some((d) => d.includes("E-commerce platform"))).toBe(true);
	});

	it("should include coding constraints", () => {
		const result = buildCodingDirectives({
			codingConstraints: "Must be accessible",
		});
		expect(result.some((d) => d.includes("accessible"))).toBe(true);
	});
});

describe("buildImageDirectives", () => {
	it("should include style-specific guidance for photorealistic", () => {
		const result = buildImageDirectives({ stylePreset: "photorealistic" });
		expect(result.some((d) => d.toLowerCase().includes("photorealistic"))).toBe(
			true,
		);
		expect(result.some((d) => d.toLowerCase().includes("photography"))).toBe(
			true,
		);
	});

	it("should include anime-specific guidance with hand-drawn terminology", () => {
		const result = buildImageDirectives({ stylePreset: "anime" });
		expect(result.some((d) => d.toLowerCase().includes("anime"))).toBe(true);
		expect(result.some((d) => d.toLowerCase().includes("hand-drawn"))).toBe(
			true,
		);
		expect(result.some((d) => d.toLowerCase().includes("cel-shading"))).toBe(
			true,
		);
	});

	it("should include strict technical specs with resolution and aspect ratio", () => {
		const result = buildImageDirectives({
			aspectRatio: "16:9",
			targetResolution: "1080p",
		});
		expect(result.some((d) => d.includes("16:9") && d.includes("1080p"))).toBe(
			true,
		);
		expect(result.some((d) => d.includes("REQUIRED") || d.includes("EXACTLY"))).toBe(
			true,
		);
	});

	it("should include instruction to not invent specifications", () => {
		const result = buildImageDirectives({ stylePreset: "anime" });
		expect(
			result.some((d) => d.toLowerCase().includes("do not invent")),
		).toBe(true);
	});
});

describe("buildVideoDirectives", () => {
	it("should include style preset", () => {
		const result = buildVideoDirectives({ stylePreset: "cinematic" });
		expect(result.some((d) => d.toLowerCase().includes("cinematic"))).toBe(
			true,
		);
	});

	it("should include camera movement", () => {
		const result = buildVideoDirectives({ cameraMovement: "dolly" });
		expect(result.some((d) => d.toLowerCase().includes("dolly"))).toBe(true);
	});

	it("should include shot type", () => {
		const result = buildVideoDirectives({ shotType: "close_up" });
		expect(result.some((d) => d.toLowerCase().includes("close"))).toBe(true);
	});

	it("should include duration", () => {
		const result = buildVideoDirectives({ durationSeconds: 10 });
		expect(result.some((d) => d.includes("10"))).toBe(true);
	});

	it("should include frame rate", () => {
		const result = buildVideoDirectives({ frameRate: 60 });
		expect(result.some((d) => d.includes("60"))).toBe(true);
	});

	it("should include storyboard requirement", () => {
		const result = buildVideoDirectives({ includeStoryboard: true });
		expect(result.some((d) => d.toLowerCase().includes("storyboard"))).toBe(
			true,
		);
	});
});

describe("buildWritingDirectives", () => {
	it("should include writing style", () => {
		const result = buildWritingDirectives({ writingStyle: "narrative" });
		expect(result.some((d) => d.toLowerCase().includes("narrative"))).toBe(
			true,
		);
	});

	it("should include point of view", () => {
		const result = buildWritingDirectives({ pointOfView: "first" });
		expect(result.some((d) => d.toLowerCase().includes("first"))).toBe(true);
	});

	it("should include reading level", () => {
		const result = buildWritingDirectives({ readingLevel: "expert" });
		expect(result.some((d) => d.toLowerCase().includes("expert"))).toBe(true);
	});

	it("should include target word count", () => {
		const result = buildWritingDirectives({ targetWordCount: 1500 });
		expect(result.some((d) => d.includes("1500"))).toBe(true);
	});

	it("should include headings requirement", () => {
		const result = buildWritingDirectives({ includeHeadings: true });
		expect(result.some((d) => d.toLowerCase().includes("heading"))).toBe(true);
	});
});

describe("buildResearchDirectives", () => {
	it("should include citations requirement when enabled", () => {
		const result = buildResearchDirectives({ requireCitations: true });
		expect(result.some((d) => d.toLowerCase().includes("citation"))).toBe(true);
	});

	it("should indicate no citations when disabled", () => {
		const result = buildResearchDirectives({ requireCitations: false });
		expect(result.some((d) => d.toLowerCase().includes("without citation"))).toBe(
			true,
		);
	});
});

describe("buildMarketingDirectives", () => {
	it("should include marketing channel", () => {
		const result = buildMarketingDirectives({ marketingChannel: "email" });
		expect(result.some((d) => d.toLowerCase().includes("email"))).toBe(true);
	});

	it("should include CTA style", () => {
		const result = buildMarketingDirectives({ ctaStyle: "strong" });
		expect(result.some((d) => d.toLowerCase().includes("strong"))).toBe(true);
	});

	it("should include value propositions", () => {
		const result = buildMarketingDirectives({
			valueProps: "Save time, increase productivity",
		});
		expect(result.some((d) => d.includes("Save time"))).toBe(true);
	});

	it("should include compliance notes", () => {
		const result = buildMarketingDirectives({
			complianceNotes: "GDPR compliant",
		});
		expect(result.some((d) => d.includes("GDPR"))).toBe(true);
	});
});

