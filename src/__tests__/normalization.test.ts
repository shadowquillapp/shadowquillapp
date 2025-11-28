import { describe, expect, it } from "vitest";
import {
	normalizeAspectRatio,
	normalizeCameraMovement,
	normalizeDurationSeconds,
	normalizeFrameRate,
	normalizeShotType,
	normalizeStylePreset,
	normalizeVideoStylePreset,
} from "@/lib/prompt-normalization";

describe("normalizeStylePreset", () => {
	it("should return valid image style presets", () => {
		expect(normalizeStylePreset("photorealistic")).toBe("photorealistic");
		expect(normalizeStylePreset("illustration")).toBe("illustration");
		expect(normalizeStylePreset("3d")).toBe("3d");
		expect(normalizeStylePreset("anime")).toBe("anime");
		expect(normalizeStylePreset("watercolor")).toBe("watercolor");
	});

	it("should return undefined for invalid presets", () => {
		expect(normalizeStylePreset("invalid")).toBeUndefined();
		expect(normalizeStylePreset("realistic")).toBeUndefined();
		expect(normalizeStylePreset("")).toBeUndefined();
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeStylePreset(undefined)).toBeUndefined();
	});

	it("should be case-sensitive", () => {
		expect(normalizeStylePreset("Photorealistic")).toBeUndefined();
		expect(normalizeStylePreset("ANIME")).toBeUndefined();
	});
});

describe("normalizeAspectRatio", () => {
	it("should return valid aspect ratios", () => {
		expect(normalizeAspectRatio("1:1")).toBe("1:1");
		expect(normalizeAspectRatio("16:9")).toBe("16:9");
		expect(normalizeAspectRatio("9:16")).toBe("9:16");
		expect(normalizeAspectRatio("4:3")).toBe("4:3");
	});

	it("should return undefined for invalid ratios", () => {
		expect(normalizeAspectRatio("2:1")).toBeUndefined();
		expect(normalizeAspectRatio("21:9")).toBeUndefined();
		expect(normalizeAspectRatio("invalid")).toBeUndefined();
		expect(normalizeAspectRatio("")).toBeUndefined();
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeAspectRatio(undefined)).toBeUndefined();
	});

	it("should not accept decimal or malformed ratios", () => {
		expect(normalizeAspectRatio("16.0:9")).toBeUndefined();
		expect(normalizeAspectRatio("16 : 9")).toBeUndefined();
	});
});

describe("normalizeVideoStylePreset", () => {
	it("should return valid video style presets", () => {
		expect(normalizeVideoStylePreset("cinematic")).toBe("cinematic");
		expect(normalizeVideoStylePreset("documentary")).toBe("documentary");
		expect(normalizeVideoStylePreset("animation")).toBe("animation");
		expect(normalizeVideoStylePreset("timelapse")).toBe("timelapse");
		expect(normalizeVideoStylePreset("vlog")).toBe("vlog");
		expect(normalizeVideoStylePreset("commercial")).toBe("commercial");
		expect(normalizeVideoStylePreset("anime")).toBe("anime");
	});

	it("should return undefined for invalid presets", () => {
		expect(normalizeVideoStylePreset("movie")).toBeUndefined();
		expect(normalizeVideoStylePreset("film")).toBeUndefined();
		expect(normalizeVideoStylePreset("")).toBeUndefined();
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeVideoStylePreset(undefined)).toBeUndefined();
	});
});

describe("normalizeCameraMovement", () => {
	it("should return valid camera movements", () => {
		expect(normalizeCameraMovement("static")).toBe("static");
		expect(normalizeCameraMovement("pan")).toBe("pan");
		expect(normalizeCameraMovement("tilt")).toBe("tilt");
		expect(normalizeCameraMovement("dolly")).toBe("dolly");
		expect(normalizeCameraMovement("zoom")).toBe("zoom");
		expect(normalizeCameraMovement("handheld")).toBe("handheld");
		expect(normalizeCameraMovement("tracking")).toBe("tracking");
	});

	it("should return undefined for invalid movements", () => {
		expect(normalizeCameraMovement("crane")).toBeUndefined();
		expect(normalizeCameraMovement("steadicam")).toBeUndefined();
		expect(normalizeCameraMovement("")).toBeUndefined();
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeCameraMovement(undefined)).toBeUndefined();
	});
});

describe("normalizeShotType", () => {
	it("should return valid shot types", () => {
		expect(normalizeShotType("wide")).toBe("wide");
		expect(normalizeShotType("medium")).toBe("medium");
		expect(normalizeShotType("close_up")).toBe("close_up");
		expect(normalizeShotType("over_the_shoulder")).toBe("over_the_shoulder");
		expect(normalizeShotType("first_person")).toBe("first_person");
	});

	it("should return undefined for invalid shot types", () => {
		expect(normalizeShotType("extreme_wide")).toBeUndefined();
		expect(normalizeShotType("closeup")).toBeUndefined(); // underscore required
		expect(normalizeShotType("")).toBeUndefined();
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeShotType(undefined)).toBeUndefined();
	});
});

describe("normalizeFrameRate", () => {
	it("should return valid frame rates", () => {
		expect(normalizeFrameRate(24)).toBe(24);
		expect(normalizeFrameRate(30)).toBe(30);
		expect(normalizeFrameRate(60)).toBe(60);
	});

	it("should return undefined for invalid frame rates", () => {
		expect(normalizeFrameRate(25)).toBeUndefined();
		expect(normalizeFrameRate(29)).toBeUndefined();
		expect(normalizeFrameRate(120)).toBeUndefined();
		expect(normalizeFrameRate(0)).toBeUndefined();
		expect(normalizeFrameRate(-30)).toBeUndefined();
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeFrameRate(undefined)).toBeUndefined();
	});

	it("should not accept decimal frame rates", () => {
		expect(normalizeFrameRate(29.97)).toBeUndefined();
		expect(normalizeFrameRate(23.976)).toBeUndefined();
	});
});

describe("normalizeDurationSeconds", () => {
	it("should return valid durations unchanged", () => {
		expect(normalizeDurationSeconds(1)).toBe(1);
		expect(normalizeDurationSeconds(30)).toBe(30);
		expect(normalizeDurationSeconds(60)).toBe(60);
	});

	it("should clamp durations below minimum to 1", () => {
		expect(normalizeDurationSeconds(0)).toBe(1);
		expect(normalizeDurationSeconds(-5)).toBe(1);
		expect(normalizeDurationSeconds(-100)).toBe(1);
	});

	it("should clamp durations above maximum to 60", () => {
		expect(normalizeDurationSeconds(61)).toBe(60);
		expect(normalizeDurationSeconds(100)).toBe(60);
		expect(normalizeDurationSeconds(1000)).toBe(60);
	});

	it("should round decimal values", () => {
		expect(normalizeDurationSeconds(5.4)).toBe(5);
		expect(normalizeDurationSeconds(5.6)).toBe(6);
		expect(normalizeDurationSeconds(10.5)).toBe(11); // rounds up
	});

	it("should return undefined for undefined input", () => {
		expect(normalizeDurationSeconds(undefined)).toBeUndefined();
	});

	it("should return undefined for NaN", () => {
		expect(normalizeDurationSeconds(Number.NaN)).toBeUndefined();
	});

	it("should handle edge cases", () => {
		expect(normalizeDurationSeconds(0.4)).toBe(1); // rounds to 0, then clamps to 1
		expect(normalizeDurationSeconds(60.4)).toBe(60); // rounds to 60
		expect(normalizeDurationSeconds(60.6)).toBe(60); // rounds to 61, then clamps to 60
	});
});

