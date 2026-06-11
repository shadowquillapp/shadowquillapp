"use client";

import { CustomSelect } from "@/components/CustomSelect";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";

interface BasicSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: unknown) => void;
}

const DETAIL_LEVELS = {
	normal: { label: "Normal", icon: "sliders" as const },
	detailed: { label: "Detailed", icon: "plus" as const },
} as const;

export default function BasicSettings({
	preset,
	onFieldChange,
}: BasicSettingsProps) {
	const options = preset.options || {};

	return (
		<div className="space-y-6">
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
					className="md-input h-8 w-full"
				/>
			</div>

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
							{ value: "intent", label: "Intent", icon: "bullseye" },
							{ value: "engineering", label: "Engineering", icon: "terminal" },
							{ value: "visual", label: "Visual", icon: "image" },
							{ value: "motion", label: "Motion", icon: "video" },
							{ value: "analysis", label: "Analysis", icon: "flask" },
							{ value: "narrative", label: "Narrative", icon: "edit" },
							{ value: "persuasion", label: "Persuasion", icon: "bullhorn" },
						]}
					/>
				</div>

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
						]}
					/>
				</div>

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

			<fieldset>
				<legend className="mb-1.5 block font-medium text-secondary text-xs">
					Detail Level
				</legend>
				<div className="grid grid-cols-2 gap-2">
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
								className="relative rounded-[var(--radius-sm)] border p-2 text-center"
								aria-pressed={isSelected}
								style={{
									borderColor: isSelected
										? "var(--color-accent)"
										: "var(--color-outline)",
									background: isSelected
										? "color-mix(in srgb, var(--color-accent) 14%, transparent)"
										: "var(--color-surface-variant)",
									color: "var(--color-on-surface)",
									transition:
										"border-color 120ms linear, background 120ms linear",
								}}
								onMouseEnter={(e) => {
									if (!isSelected) {
										e.currentTarget.style.borderColor = "var(--surfacea50)";
									}
								}}
								onMouseLeave={(e) => {
									if (!isSelected) {
										e.currentTarget.style.borderColor = "var(--color-outline)";
									}
								}}
							>
								<div className="flex items-center justify-center gap-2">
									<Icon
										name={meta.icon}
										className="h-4 w-4"
										style={{
											color: isSelected
												? "var(--color-on-surface)"
												: "var(--color-on-surface-variant)",
										}}
									/>
									<span className="font-semibold text-xs">{meta.label}</span>
								</div>
							</button>
						);
					})}
				</div>
			</fieldset>

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
		</div>
	);
}
