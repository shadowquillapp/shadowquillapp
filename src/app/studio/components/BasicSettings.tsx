"use client";

import { CustomSelect } from "@/components/CustomSelect";
import type { PresetLite } from "@/types";
import SettingRow from "./SettingRow";

interface BasicSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: unknown) => void;
}

export default function BasicSettings({
	preset,
	onFieldChange,
}: BasicSettingsProps) {
	const options = preset.options || {};
	const detailLevel = options.detail || "normal";

	return (
		<div className="flex flex-col">
			<SettingRow
				label="Preset Name"
				description="Display name in the preset library"
				htmlFor="preset-name"
			>
				<input
					id="preset-name"
					type="text"
					value={preset.name}
					onChange={(e) => onFieldChange("name", e.target.value)}
					placeholder="Enter preset name"
					className="md-input w-full"
				/>
			</SettingRow>

			<SettingRow
				label="Task Type"
				description="Prompt compilation strategy and domain directives"
				htmlFor="task-type"
			>
				<CustomSelect
					id="task-type"
					value={preset.taskType}
					onChange={(v) => onFieldChange("taskType", v)}
					options={[
						{ value: "intent", label: "Intent", icon: "bullseye" },
						{ value: "engineering", label: "Engineering", icon: "terminal" },
						{ value: "visual", label: "Visual", icon: "image" },
						{ value: "motion", label: "Motion", icon: "video" },
						{ value: "analysis", label: "Analysis", icon: "flask" },
						{ value: "narrative", label: "Narrative", icon: "edit" },
						{ value: "persuasion", label: "Persuasion", icon: "bullhorn" },
					]}
				/>
			</SettingRow>

			<SettingRow
				label="Output Format"
				description="Structure of generated responses"
				htmlFor="output-format"
			>
				<CustomSelect
					id="output-format"
					value={options.format || "markdown"}
					onChange={(v) => onFieldChange("format", v)}
					options={[
						{ value: "plain", label: "Plain Text" },
						{ value: "markdown", label: "Markdown" },
					]}
				/>
			</SettingRow>

			<SettingRow
				label="Tone"
				description="Voice and register for model output"
				htmlFor="tone"
			>
				<CustomSelect
					id="tone"
					value={options.tone || "neutral"}
					onChange={(v) => onFieldChange("tone", v)}
					options={[
						{ value: "neutral", label: "Neutral", icon: "equals" },
						{ value: "friendly", label: "Friendly", icon: "face-smile" },
						{ value: "formal", label: "Formal", icon: "briefcase" },
						{ value: "technical", label: "Technical", icon: "tools" },
						{ value: "persuasive", label: "Persuasive", icon: "sparkles" },
					]}
				/>
			</SettingRow>

			<SettingRow
				label="Detail Level"
				description="Amount of elaboration in compiled prompts"
			>
				<fieldset className="settings-segmented" aria-label="Detail Level">
					<button
						type="button"
						aria-pressed={detailLevel === "normal"}
						onClick={() => onFieldChange("detail", "normal")}
					>
						Normal
					</button>
					<button
						type="button"
						aria-pressed={detailLevel === "detailed"}
						onClick={() => onFieldChange("detail", "detailed")}
					>
						Detailed
					</button>
				</fieldset>
			</SettingRow>

			<SettingRow
				label="Output Language"
				description="Language used in model responses"
				htmlFor="output-language"
			>
				<CustomSelect
					id="output-language"
					value={options.language || "English"}
					onChange={(v) => onFieldChange("language", v)}
					options={[
						{ value: "English", label: "English" },
						{ value: "Dutch", label: "Dutch" },
						{ value: "German", label: "German" },
						{ value: "French", label: "French" },
						{ value: "Spanish", label: "Spanish" },
						{ value: "Arabic", label: "Arabic" },
						{ value: "Mandarin", label: "Mandarin" },
					]}
				/>
			</SettingRow>
		</div>
	);
}
