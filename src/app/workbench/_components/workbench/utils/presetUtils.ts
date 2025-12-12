import type { Preset } from "@/lib/presets";
import type { GenerationOptions, TaskType } from "@/types";
import type { PromptPresetSummary } from "../types";

/**
 * Maps a Preset to a PromptPresetSummary format.
 */
export function mapPresetToSummary(preset: {
	id?: string;
	name: string;
	taskType: TaskType;
	options?: GenerationOptions;
}): PromptPresetSummary {
	const summary: PromptPresetSummary = {
		name: preset.name,
		taskType: preset.taskType,
		...(preset.options && { options: preset.options }),
	};
	if (typeof preset.id === "string") summary.id = preset.id;
	return summary;
}

/**
 * Maps a Preset array to the internal preset list format.
 */
export function mapPresetList(presets: Preset[]): Array<{
	id?: string;
	name: string;
	taskType: TaskType;
	options?: GenerationOptions;
}> {
	return (presets ?? []).map((p: Preset) => ({
		...(p.id && { id: p.id }),
		name: p.name,
		taskType: p.taskType,
		...(p.options && { options: p.options }),
	}));
}
