"use client";

import TemperatureControl from "@/app/studio/components/TemperatureControl";
import { CustomSelect } from "@/components/CustomSelect";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";
import React from "react";

interface BasicSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: unknown) => void;
}

/** Detail level metadata with word count ranges */
const DETAIL_LEVELS = {
	brief: {
		label: "Brief",
		words: "75-150",
		description: "Concise and to the point",
		icon: "minus",
		color: "#3b82f6",
	},
	normal: {
		label: "Normal",
		words: "200-250",
		description: "Standard level of detail",
		icon: "sliders",
		color: "#22c55e",
	},
	detailed: {
		label: "Detailed",
		words: "300-375",
		description: "Comprehensive coverage",
		icon: "plus",
		color: "#f59e0b",
	},
} as const;

export default function BasicSettings({
	preset,
	onFieldChange,
}: BasicSettingsProps) {
	const options = preset.options || {};

	return (
		<div className="mt-4 space-y-6">
			{/* Preset Name - full width */}
			<div>
				<label
					htmlFor="preset-name"
					className="mb-1.5 block font-medium text-secondary text-xs"
				>
					Preset Name
				</label>
				<input
					id="preset-name"
					type="text"
					value={preset.name}
					onChange={(e) => onFieldChange("name", e.target.value)}
					placeholder="Enter preset name"
					className="md-input !rounded-lg h-10 w-full px-3 py-2 text-sm"
				/>
			</div>

			{/* Task Type with visual indicator */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div>
					<label
						htmlFor="task-type"
						className="mb-1.5 block font-medium text-secondary text-xs"
					>
						Task Type
					</label>
					<CustomSelect
						id="task-type"
						value={preset.taskType}
						onChange={(v) => onFieldChange("taskType", v)}
						options={[
							{ value: "general", label: "General", icon: "bullseye" },
							{ value: "coding", label: "Coding", icon: "terminal" },
							{ value: "image", label: "Image", icon: "image" },
							{ value: "video", label: "Video", icon: "video" },
							{ value: "research", label: "Research", icon: "flask" },
							{ value: "writing", label: "Writing", icon: "edit" },
							{ value: "marketing", label: "Marketing", icon: "bullhorn" },
						]}
					/>
				</div>

				{/* Format with preview */}
				<div>
					<label
						htmlFor="output-format"
						className="mb-1.5 block font-medium text-secondary text-xs"
					>
						Output Format
					</label>
					<CustomSelect
						id="output-format"
						value={options.format || "markdown"}
						onChange={(v) => onFieldChange("format", v)}
						options={[
							{ value: "plain", label: "Plain Text" },
							{ value: "markdown", label: "Markdown" },
							{ value: "xml", label: "XML" },
						]}
					/>
				</div>

				{/* Tone with icon indicator */}
				<div>
					<label
						htmlFor="tone"
						className="mb-1.5 block font-medium text-secondary text-xs"
					>
						Tone
					</label>
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
				</div>
			</div>

			{/* Detail Level - simplified */}
			<div>
				<div className="mb-1.5 block font-medium text-secondary text-xs">
					Detail Level
				</div>
				<div className="grid grid-cols-3 gap-2">
					{(
						Object.keys(DETAIL_LEVELS) as Array<keyof typeof DETAIL_LEVELS>
					).map((level) => {
						const meta = DETAIL_LEVELS[level];
						const isSelected = (options.detail || "normal") === level;

						return (
							<button
								key={level}
								type="button"
								onClick={() => onFieldChange("detail", level)}
								className={`relative rounded-xl border p-3 text-center transition-all duration-200 ${
									isSelected
										? "border-primary bg-primary/10"
										: "border-[var(--color-outline)] bg-[var(--color-surface)] hover:border-primary/50 hover:bg-[var(--color-surface-variant)]"
								}`}
							>
								<div className="flex items-center justify-center gap-2">
									<Icon
										name={meta.icon}
										className="h-3.5 w-3.5"
										style={{
											color: isSelected ? meta.color : "var(--color-secondary)",
										}}
									/>
									<span
										className={`font-semibold text-xs ${
											isSelected ? "text-primary" : "text-on-surface"
										}`}
									>
										{meta.label}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Language */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label
						htmlFor="output-language"
						className="mb-1.5 block font-medium text-secondary text-xs"
					>
						Output Language
					</label>
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
				</div>
			</div>

			{/* Temperature - full width with enhanced control */}
			<div className="pt-2">
				<TemperatureControl
					value={options.temperature ?? 0.7}
					onChange={(v) => onFieldChange("temperature", v)}
				/>
			</div>
		</div>
	);
}
