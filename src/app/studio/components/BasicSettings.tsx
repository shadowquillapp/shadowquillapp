"use client";

import TemperatureControl from "@/app/studio/components/TemperatureControl";
import type { PresetLite } from "@/app/studio/types";
import { CustomSelect } from "@/components/CustomSelect";
import React from "react";

interface BasicSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: any) => void;
}

export default function BasicSettings({
	preset,
	onFieldChange,
}: BasicSettingsProps) {
	const options = preset.options || {};

	return (
		<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{/* Preset Name - full width */}
			<div className="md:col-span-2 lg:col-span-3">
				<label className="mb-1 block font-medium text-secondary text-xs">
					Preset Name
				</label>
				<input
					type="text"
					value={preset.name}
					onChange={(e) => onFieldChange("name", e.target.value)}
					placeholder="Enter preset name"
					className="md-input w-full h-10 !rounded-lg py-2 px-3 text-sm"
				/>
			</div>

			{/* Task Type */}
			<div>
				<label className="mb-1 block font-medium text-secondary text-xs">
					Type
				</label>
				<CustomSelect
					value={preset.taskType}
					onChange={(v) => onFieldChange("taskType", v)}
					options={[
						{ value: "general", label: "General" },
						{ value: "coding", label: "Coding" },
						{ value: "image", label: "Image" },
						{ value: "video", label: "Video" },
						{ value: "research", label: "Research" },
						{ value: "writing", label: "Writing" },
						{ value: "marketing", label: "Marketing" },
					]}
				/>
			</div>

			{/* Format */}
			<div>
				<label className="mb-1 block font-medium text-secondary text-xs">
					Format
				</label>
				<CustomSelect
					value={options.format || "markdown"}
					onChange={(v) => onFieldChange("format", v)}
					options={[
						{ value: "plain", label: "Plain Text" },
						{ value: "markdown", label: "Markdown" },
						{ value: "xml", label: "XML" },
					]}
				/>
			</div>

			{/* Tone */}
			<div>
				<label className="mb-1 block font-medium text-secondary text-xs">
					Tone
				</label>
				<CustomSelect
					value={options.tone || "neutral"}
					onChange={(v) => onFieldChange("tone", v)}
					options={[
						{ value: "neutral", label: "Neutral" },
						{ value: "friendly", label: "Friendly" },
						{ value: "formal", label: "Formal" },
						{ value: "technical", label: "Technical" },
						{ value: "persuasive", label: "Persuasive" },
					]}
				/>
			</div>

			{/* Detail Level */}
			<div>
				<label className="mb-1 block font-medium text-secondary text-xs">
					Detail Level
				</label>
				<CustomSelect
					value={options.detail || "normal"}
					onChange={(v) => onFieldChange("detail", v)}
					options={[
						{ value: "brief", label: "Brief" },
						{ value: "normal", label: "Normal" },
						{ value: "detailed", label: "Detailed" },
					]}
				/>
			</div>

			{/* Language */}
			<div>
				<label className="mb-1 block font-medium text-secondary text-xs">
					Language
				</label>
				<CustomSelect
					value={options.language || "English"}
					onChange={(v) => onFieldChange("language", v)}
					options={[
						{ value: "English", label: "English" },
						{ value: "Spanish", label: "Spanish" },
						{ value: "French", label: "French" },
						{ value: "German", label: "German" },
						{ value: "Italian", label: "Italian" },
						{ value: "Portuguese", label: "Portuguese" },
						{ value: "Dutch", label: "Dutch" },
						{ value: "Russian", label: "Russian" },
						{ value: "Japanese", label: "Japanese" },
						{ value: "Korean", label: "Korean" },
						{ value: "Chinese", label: "Chinese" },
						{ value: "Arabic", label: "Arabic" },
						{ value: "Hindi", label: "Hindi" },
					]}
				/>
			</div>

			{/* Temperature - full width */}
			<div className="md:col-span-2 lg:col-span-3">
				<TemperatureControl
					value={options.temperature ?? 0.7}
					onChange={(v) => onFieldChange("temperature", v)}
				/>
			</div>
		</div>
	);
}
