import type {
	CameraMovement,
	FrameRate,
	ImageAspectRatio,
	ImageStylePreset,
	ShotType,
	VideoStylePreset,
} from "@/types";

const IMAGE_STYLE_PRESETS: readonly ImageStylePreset[] = [
	"photorealistic",
	"illustration",
	"3d",
	"anime",
	"watercolor",
];
const IMAGE_ASPECT_RATIOS: readonly ImageAspectRatio[] = [
	"1:1",
	"16:9",
	"9:16",
	"4:3",
];
const VIDEO_STYLE_PRESETS: readonly VideoStylePreset[] = [
	"cinematic",
	"documentary",
	"animation",
	"timelapse",
	"vlog",
	"commercial",
	"anime",
];
const CAMERA_MOVEMENTS: readonly CameraMovement[] = [
	"static",
	"pan",
	"tilt",
	"dolly",
	"zoom",
	"handheld",
	"tracking",
];
const SHOT_TYPES: readonly ShotType[] = [
	"wide",
	"medium",
	"close_up",
	"over_the_shoulder",
	"first_person",
];
const FRAME_RATES: readonly FrameRate[] = [24, 30, 60];

const normalizeAllowed = <T extends string | number>(
	value: string | number | undefined,
	allowed: readonly T[],
): T | undefined => {
	return allowed.includes(value as T) ? (value as T) : undefined;
};

export const normalizeStylePreset = (
	v: string | undefined,
): ImageStylePreset | undefined => normalizeAllowed(v, IMAGE_STYLE_PRESETS);

export const normalizeAspectRatio = (
	v: string | undefined,
): ImageAspectRatio | undefined => normalizeAllowed(v, IMAGE_ASPECT_RATIOS);

export const normalizeVideoStylePreset = (
	v: string | undefined,
): VideoStylePreset | undefined => normalizeAllowed(v, VIDEO_STYLE_PRESETS);

export const normalizeCameraMovement = (
	v: string | undefined,
): CameraMovement | undefined => normalizeAllowed(v, CAMERA_MOVEMENTS);

export const normalizeShotType = (
	v: string | undefined,
): ShotType | undefined => normalizeAllowed(v, SHOT_TYPES);

export const normalizeFrameRate = (
	v: number | undefined,
): FrameRate | undefined => normalizeAllowed(v, FRAME_RATES);

export const normalizeDurationSeconds = (
	v: number | undefined,
): number | undefined => {
	if (typeof v !== "number" || Number.isNaN(v)) return undefined;
	const clamped = Math.max(1, Math.min(60, Math.round(v)));
	return clamped;
};
