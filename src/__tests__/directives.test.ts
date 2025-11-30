import { buildDirectives } from "@/lib/prompt-directives";
import {
	buildAdvancedDirectives,
	buildBaseDirectives,
	buildFormatDirectives,
} from "@/lib/prompt-directives/base";
import { buildCodingDirectives } from "@/lib/prompt-directives/coding";
import { buildImageDirectives } from "@/lib/prompt-directives/image";
import { buildMarketingDirectives } from "@/lib/prompt-directives/marketing";
import { buildResearchDirectives } from "@/lib/prompt-directives/research";
import { buildVideoDirectives } from "@/lib/prompt-directives/video";
import { buildWritingDirectives } from "@/lib/prompt-directives/writing";
import type {
	CTAStyle,
	CameraMovement,
	Detail,
	ImageStylePreset,
	MarketingChannel,
	PointOfView,
	ReadingLevel,
	ReasoningStyle,
	TaskType,
	Tone,
	WritingStyle,
} from "@/types";
import { describe, expect, it } from "vitest";

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

	describe("all task types", () => {
		it("should include image directives for image task", () => {
			const result = buildDirectives("image", { stylePreset: "anime" });
			expect(result.some((d) => d.toLowerCase().includes("anime"))).toBe(true);
		});

		it("should include video directives for video task", () => {
			const result = buildDirectives("video", { cameraMovement: "pan" });
			expect(result.some((d) => d.toLowerCase().includes("pan"))).toBe(true);
		});

		it("should include writing directives for writing task", () => {
			const result = buildDirectives("writing", { writingStyle: "narrative" });
			expect(result.some((d) => d.toLowerCase().includes("narrative"))).toBe(
				true,
			);
		});

		it("should include research directives for research task", () => {
			const result = buildDirectives("research", { requireCitations: true });
			expect(result.some((d) => d.toLowerCase().includes("citation"))).toBe(
				true,
			);
		});

		it("should include marketing directives for marketing task", () => {
			const result = buildDirectives("marketing", { ctaStyle: "strong" });
			expect(result.some((d) => d.toLowerCase().includes("strong"))).toBe(true);
		});

		it("should handle general task with no additional directives", () => {
			const result = buildDirectives("general", { tone: "formal" });
			// Should only have base directives
			expect(result.some((d) => d.toLowerCase().includes("formal"))).toBe(true);
		});
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

	it("should skip unknown reasoning style", () => {
		const result = buildAdvancedDirectives({
			reasoningStyle: "unknown-style" as unknown as ReasoningStyle,
		});
		expect(result.some((d) => d.includes("unknown-style"))).toBe(false);
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
		expect(
			result.some((d) => d.includes("REQUIRED") || d.includes("EXACTLY")),
		).toBe(true);
	});

	it("should include instruction to not invent specifications", () => {
		const result = buildImageDirectives({ stylePreset: "anime" });
		expect(result.some((d) => d.toLowerCase().includes("do not invent"))).toBe(
			true,
		);
	});

	it("should include illustration style guidance", () => {
		const result = buildImageDirectives({ stylePreset: "illustration" });
		expect(result.some((d) => d.toLowerCase().includes("illustration"))).toBe(
			true,
		);
		expect(result.some((d) => d.toLowerCase().includes("linework"))).toBe(true);
	});

	it("should include watercolor style guidance", () => {
		const result = buildImageDirectives({ stylePreset: "watercolor" });
		expect(result.some((d) => d.toLowerCase().includes("watercolor"))).toBe(
			true,
		);
		expect(result.some((d) => d.toLowerCase().includes("washes"))).toBe(true);
	});

	it("should include 3D style guidance", () => {
		const result = buildImageDirectives({ stylePreset: "3d" });
		expect(result.some((d) => d.toLowerCase().includes("3d render"))).toBe(
			true,
		);
		expect(result.some((d) => d.toLowerCase().includes("ray tracing"))).toBe(
			true,
		);
	});

	it("should handle unknown style preset", () => {
		const result = buildImageDirectives({
			stylePreset: "custom-style" as ImageStylePreset,
		});
		expect(result.some((d) => d.toLowerCase().includes("visual style"))).toBe(
			true,
		);
		expect(result.some((d) => d.includes("custom-style"))).toBe(true);
	});

	it("should include only aspect ratio when no resolution", () => {
		const result = buildImageDirectives({ aspectRatio: "1:1" });
		expect(result.some((d) => d.includes("1:1"))).toBe(true);
		expect(result.some((d) => d.includes("REQUIRED"))).toBe(true);
	});

	it("should include only resolution when no aspect ratio", () => {
		const result = buildImageDirectives({ targetResolution: "4K" });
		expect(result.some((d) => d.includes("4K"))).toBe(true);
		expect(result.some((d) => d.includes("REQUIRED"))).toBe(true);
	});

	it("should always include default mood directive", () => {
		const result = buildImageDirectives({});
		expect(result.some((d) => d.toLowerCase().includes("default mood"))).toBe(
			true,
		);
		expect(
			result.some((d) => d.toLowerCase().includes("bright, positive")),
		).toBe(true);
	});

	it("should always include prompt structure guidance", () => {
		const result = buildImageDirectives({});
		expect(
			result.some((d) => d.toLowerCase().includes("focused and concise")),
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

	it("should include aspect ratio", () => {
		const result = buildVideoDirectives({ aspectRatio: "16:9" });
		expect(result.some((d) => d.includes("16:9"))).toBe(true);
	});

	it("should include target resolution", () => {
		const result = buildVideoDirectives({ targetResolution: "4K" });
		expect(result.some((d) => d.includes("4K"))).toBe(true);
	});

	describe("2D animation styles", () => {
		it("should use animation terminology for anime style", () => {
			const result = buildVideoDirectives({
				stylePreset: "anime",
				cameraMovement: "pan",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("animation terminology")),
			).toBe(true);
			expect(result.some((d) => d.toLowerCase().includes("fast panning"))).toBe(
				true,
			);
		});

		it("should use animation terminology for animation style", () => {
			const result = buildVideoDirectives({
				stylePreset: "animation",
				cameraMovement: "zoom",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("animation terminology")),
			).toBe(true);
			expect(result.some((d) => d.toLowerCase().includes("snap zoom"))).toBe(
				true,
			);
		});

		it("should use animation terminology for animation style with tracking", () => {
			const result = buildVideoDirectives({
				stylePreset: "animation",
				cameraMovement: "tracking",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("animation terminology")),
			).toBe(true);
			expect(
				result.some((d) => d.toLowerCase().includes("perspective shifts")),
			).toBe(true);
		});

		it("should use animation terminology for anime style with static", () => {
			const result = buildVideoDirectives({
				stylePreset: "anime",
				cameraMovement: "static",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("animation terminology")),
			).toBe(true);
			expect(
				result.some((d) => d.toLowerCase().includes("static framing")),
			).toBe(true);
		});

		it("should handle dolly movement for 2D animation", () => {
			const result = buildVideoDirectives({
				stylePreset: "anime",
				cameraMovement: "dolly",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("dynamic perspective")),
			).toBe(true);
		});

		it("should handle tilt movement for 2D animation", () => {
			const result = buildVideoDirectives({
				stylePreset: "anime",
				cameraMovement: "tilt",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("dramatic angle")),
			).toBe(true);
		});

		it("should handle handheld movement for 2D animation", () => {
			const result = buildVideoDirectives({
				stylePreset: "anime",
				cameraMovement: "handheld",
			});
			expect(result.some((d) => d.toLowerCase().includes("energetic"))).toBe(
				true,
			);
		});

		it("should handle unknown camera movement for 2D animation", () => {
			const result = buildVideoDirectives({
				stylePreset: "anime",
				cameraMovement: "orbit" as CameraMovement,
			});
			expect(
				result.some((d) => d.toLowerCase().includes("animation techniques")),
			).toBe(true);
		});
	});

	describe("cinematic styles", () => {
		it("should use cinematic terminology for non-2D styles", () => {
			const result = buildVideoDirectives({
				stylePreset: "cinematic",
				cameraMovement: "dolly",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("cinematic terminology")),
			).toBe(true);
			expect(result.some((d) => d.toLowerCase().includes("camera"))).toBe(true);
		});

		it("should use cinematic terminology when no style preset", () => {
			const result = buildVideoDirectives({
				cameraMovement: "pan",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("cinematic terminology")),
			).toBe(true);
		});

		it("should use cinematic terminology for photorealistic style", () => {
			const result = buildVideoDirectives({
				stylePreset: "photorealistic",
				cameraMovement: "tracking",
			});
			expect(
				result.some((d) => d.toLowerCase().includes("cinematic terminology")),
			).toBe(true);
		});
	});

	describe("storyboard calculations", () => {
		it("should calculate frames for short duration (< 10 seconds)", () => {
			const result = buildVideoDirectives({
				includeStoryboard: true,
				durationSeconds: 5,
			});
			// For 5 seconds: ceil(5/2) = 3 frames
			expect(result.some((d) => d.includes("3 frames"))).toBe(true);
		});

		it("should calculate frames for longer duration (>= 10 seconds)", () => {
			const result = buildVideoDirectives({
				includeStoryboard: true,
				durationSeconds: 15,
			});
			// For 15 seconds: ceil(15/3) = 5 frames
			expect(result.some((d) => d.includes("5 frames"))).toBe(true);
		});

		it("should use default duration of 5 seconds when not specified", () => {
			const result = buildVideoDirectives({
				includeStoryboard: true,
			});
			// Default 5 seconds: ceil(5/2) = 3 frames
			expect(result.some((d) => d.includes("3 frames"))).toBe(true);
		});
	});

	describe("default mood", () => {
		it("should always include default positive mood directive", () => {
			const result = buildVideoDirectives({});
			expect(result.some((d) => d.toLowerCase().includes("default mood"))).toBe(
				true,
			);
			expect(
				result.some((d) => d.toLowerCase().includes("bright, positive")),
			).toBe(true);
		});
	});
});

describe("buildWritingDirectives", () => {
	it("should include writing style", () => {
		const result = buildWritingDirectives({ writingStyle: "narrative" });
		expect(result.some((d) => d.toLowerCase().includes("narrative"))).toBe(
			true,
		);
	});

	it("should use fallback for unknown writing style", () => {
		const result = buildWritingDirectives({
			writingStyle: "unknown-style" as unknown as WritingStyle,
		});
		expect(
			result.some((d) => d.includes("Writing style: unknown-style.")),
		).toBe(true);
	});

	it("should include point of view", () => {
		const result = buildWritingDirectives({ pointOfView: "first" });
		expect(result.some((d) => d.toLowerCase().includes("first"))).toBe(true);
	});

	it("should skip unknown point of view", () => {
		const result = buildWritingDirectives({
			pointOfView: "unknown-pov" as unknown as PointOfView,
		});
		expect(result.some((d) => d.includes("unknown-pov"))).toBe(false);
	});

	it("should include reading level", () => {
		const result = buildWritingDirectives({ readingLevel: "expert" });
		expect(result.some((d) => d.toLowerCase().includes("expert"))).toBe(true);
	});

	it("should skip unknown reading level", () => {
		const result = buildWritingDirectives({
			readingLevel: "unknown-level" as unknown as ReadingLevel,
		});
		expect(result.some((d) => d.includes("unknown-level"))).toBe(false);
	});

	it("should include target word count", () => {
		const result = buildWritingDirectives({ targetWordCount: 1500 });
		expect(result.some((d) => d.includes("1500"))).toBe(true);
	});

	it("should skip target word count when not a number", () => {
		const result = buildWritingDirectives({
			targetWordCount: "1500" as unknown as number,
		});
		expect(result.some((d) => d.includes("1500"))).toBe(false);
	});

	it("should include headings requirement", () => {
		const result = buildWritingDirectives({ includeHeadings: true });
		expect(result.some((d) => d.toLowerCase().includes("heading"))).toBe(true);
	});

	it("should not include headings when false", () => {
		const result = buildWritingDirectives({ includeHeadings: false });
		expect(result.some((d) => d.toLowerCase().includes("heading"))).toBe(false);
	});
});

describe("buildResearchDirectives", () => {
	it("should include citations requirement when enabled", () => {
		const result = buildResearchDirectives({ requireCitations: true });
		expect(result.some((d) => d.toLowerCase().includes("citation"))).toBe(true);
	});

	it("should indicate no citations when disabled", () => {
		const result = buildResearchDirectives({ requireCitations: false });
		expect(
			result.some((d) => d.toLowerCase().includes("without citation")),
		).toBe(true);
	});

	it("should always include research methodology guidance", () => {
		const result = buildResearchDirectives({});
		expect(
			result.some((d) => d.toLowerCase().includes("depth of analysis")),
		).toBe(true);
		expect(result.some((d) => d.toLowerCase().includes("methodology"))).toBe(
			true,
		);
	});

	it("should not include citation directive when undefined", () => {
		const result = buildResearchDirectives({});
		// Should only have the base directive, not citation-specific ones
		expect(result.length).toBe(1);
		expect(
			result.some((d) => d.toLowerCase().includes("require citations")),
		).toBe(false);
	});
});

describe("buildMarketingDirectives", () => {
	it("should include marketing channel", () => {
		const result = buildMarketingDirectives({ marketingChannel: "email" });
		expect(result.some((d) => d.toLowerCase().includes("email"))).toBe(true);
	});

	it("should use fallback for unknown marketing channel", () => {
		const result = buildMarketingDirectives({
			marketingChannel: "unknown-channel" as unknown as MarketingChannel,
		});
		expect(result.some((d) => d.includes("Channel: unknown-channel."))).toBe(
			true,
		);
	});

	it("should include CTA style", () => {
		const result = buildMarketingDirectives({ ctaStyle: "strong" });
		expect(result.some((d) => d.toLowerCase().includes("strong"))).toBe(true);
	});

	it("should skip unknown CTA style", () => {
		const result = buildMarketingDirectives({
			ctaStyle: "unknown-style" as unknown as CTAStyle,
		});
		expect(result.some((d) => d.includes("unknown-style"))).toBe(false);
	});

	it("should include value propositions", () => {
		const result = buildMarketingDirectives({
			valueProps: "Save time, increase productivity",
		});
		expect(result.some((d) => d.includes("Save time"))).toBe(true);
	});

	it("should skip empty value propositions", () => {
		const result = buildMarketingDirectives({ valueProps: "" });
		expect(result.some((d) => d.includes("Value propositions"))).toBe(false);
	});

	it("should skip whitespace-only value propositions", () => {
		const result = buildMarketingDirectives({ valueProps: "   " });
		expect(result.some((d) => d.includes("Value propositions"))).toBe(false);
	});

	it("should include compliance notes", () => {
		const result = buildMarketingDirectives({
			complianceNotes: "GDPR compliant",
		});
		expect(result.some((d) => d.includes("GDPR"))).toBe(true);
	});

	it("should skip empty compliance notes", () => {
		const result = buildMarketingDirectives({ complianceNotes: "" });
		expect(result.some((d) => d.includes("Compliance requirements"))).toBe(
			false,
		);
	});

	it("should skip whitespace-only compliance notes", () => {
		const result = buildMarketingDirectives({ complianceNotes: "   " });
		expect(result.some((d) => d.includes("Compliance requirements"))).toBe(
			false,
		);
	});
});
