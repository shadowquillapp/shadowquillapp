import type {
	CameraMovement,
	FrameRate,
	ImageAspectRatio,
	ImageStylePreset,
	ShotType,
	VideoStylePreset,
} from "@/types";

export const normalizeStylePreset = (
	v: string | undefined,
): ImageStylePreset | undefined => {
	const allowed: ImageStylePreset[] = [
		"photorealistic",
		"illustration",
		"3d",
		"anime",
		"watercolor",
	];
	return allowed.includes(v as ImageStylePreset)
		? (v as ImageStylePreset)
		: undefined;
};

export const normalizeAspectRatio = (
	v: string | undefined,
): ImageAspectRatio | undefined => {
	const allowed: ImageAspectRatio[] = ["1:1", "16:9", "9:16", "4:3"];
	return allowed.includes(v as ImageAspectRatio)
		? (v as ImageAspectRatio)
		: undefined;
};

export const normalizeVideoStylePreset = (
	v: string | undefined,
): VideoStylePreset | undefined => {
	const allowed: VideoStylePreset[] = [
		"cinematic",
		"documentary",
		"animation",
		"timelapse",
		"vlog",
		"commercial",
		"anime",
	];
	return allowed.includes(v as VideoStylePreset)
		? (v as VideoStylePreset)
		: undefined;
};

export const normalizeCameraMovement = (
	v: string | undefined,
): CameraMovement | undefined => {
	const allowed: CameraMovement[] = [
		"static",
		"pan",
		"tilt",
		"dolly",
		"zoom",
		"handheld",
		"tracking",
	];
	return allowed.includes(v as CameraMovement)
		? (v as CameraMovement)
		: undefined;
};

export const normalizeShotType = (v: string | undefined): ShotType | undefined => {
	const allowed: ShotType[] = [
		"wide",
		"medium",
		"close_up",
		"over_the_shoulder",
		"first_person",
	];
	return allowed.includes(v as ShotType) ? (v as ShotType) : undefined;
};

export const normalizeFrameRate = (v: number | undefined): FrameRate | undefined => {
	const allowed: FrameRate[] = [24, 30, 60];
	return allowed.includes(v as FrameRate) ? (v as FrameRate) : undefined;
};

export const normalizeDurationSeconds = (
	v: number | undefined,
): number | undefined => {
	if (typeof v !== "number" || Number.isNaN(v)) return undefined;
	const clamped = Math.max(1, Math.min(60, Math.round(v)));
	return clamped;
};

