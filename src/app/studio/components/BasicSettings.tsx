"use client";

import TemperatureControl from "@/app/studio/components/TemperatureControl";
import type { PresetLite } from "@/types";
import { CustomSelect } from "@/components/CustomSelect";
import { Icon } from "@/components/Icon";
import React, { useMemo } from "react";

interface BasicSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: any) => void;
}

/** Detail level metadata with word count ranges */
const DETAIL_LEVELS = {
	brief: {
		label: "Brief",
		words: "100-150",
		description: "Concise and to the point",
		icon: "minus",
		color: "#3b82f6",
	},
	normal: {
		label: "Normal",
		words: "200-300",
		description: "Standard level of detail",
		icon: "sliders",
		color: "#22c55e",
	},
	detailed: {
		label: "Detailed",
		words: "350-500",
		description: "Comprehensive coverage",
		icon: "plus",
		color: "#f59e0b",
	},
} as const;

/** Format metadata with example snippets */
const FORMAT_METADATA = {
	plain: {
		label: "Plain Text",
		description: "No formatting, simple text",
		example: "This is plain text output without any special formatting.",
		icon: "file-text",
	},
	markdown: {
		label: "Markdown",
		description: "Headers, bullets, emphasis",
		example: "## Title\n- **Bold** text\n- *Italic* text",
		icon: "edit",
	},
	xml: {
		label: "XML",
		description: "Structured XML tags",
		example: "<prompt>\n  <title>...</title>\n</prompt>",
		icon: "git-compare",
	},
} as const;

/** Tone metadata */
const TONE_METADATA = {
	neutral: {
		label: "Neutral",
		description: "Matter-of-fact",
		emoji: "😐",
	},
	friendly: {
		label: "Friendly",
		description: "Warm and approachable",
		emoji: "😊",
	},
	formal: {
		label: "Formal",
		description: "Professional tone",
		emoji: "🎩",
	},
	technical: {
		label: "Technical",
		description: "Precise and detailed",
		emoji: "🔧",
	},
	persuasive: {
		label: "Persuasive",
		description: "Compelling and engaging",
		emoji: "💫",
	},
} as const;

export default function BasicSettings({
	preset,
	onFieldChange,
}: BasicSettingsProps) {
	const options = preset.options || {};

	// Current detail level info
	const currentDetail = useMemo(() => {
		const detail = (options.detail || "normal") as keyof typeof DETAIL_LEVELS;
		return DETAIL_LEVELS[detail] || DETAIL_LEVELS.normal;
	}, [options.detail]);

	// Current format info
	const currentFormat = useMemo(() => {
		const format = (options.format || "markdown") as keyof typeof FORMAT_METADATA;
		return FORMAT_METADATA[format] || FORMAT_METADATA.markdown;
	}, [options.format]);

	// Current tone info
	const currentTone = useMemo(() => {
		const tone = (options.tone || "neutral") as keyof typeof TONE_METADATA;
		return TONE_METADATA[tone] || TONE_METADATA.neutral;
	}, [options.tone]);

	return (
		<div className="mt-4 space-y-6">
			{/* Preset Name - full width */}
			<div>
				<label className="mb-1.5 block font-medium text-secondary text-xs">
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

			{/* Task Type with visual indicator */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div>
					<label className="mb-1.5 block font-medium text-secondary text-xs">
						Task Type
					</label>
					<CustomSelect
						value={preset.taskType}
						onChange={(v) => onFieldChange("taskType", v)}
						options={[
							{ value: "general", label: "🎯 General" },
							{ value: "coding", label: "💻 Coding" },
							{ value: "image", label: "🎨 Image" },
							{ value: "video", label: "🎬 Video" },
							{ value: "research", label: "🔬 Research" },
							{ value: "writing", label: "✍️ Writing" },
							{ value: "marketing", label: "📣 Marketing" },
						]}
					/>
				</div>

				{/* Format with preview */}
				<div>
					<label className="mb-1.5 block font-medium text-secondary text-xs">
						Output Format
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

				{/* Tone with emoji indicator */}
				<div>
					<label className="mb-1.5 block font-medium text-secondary text-xs">
						Tone
					</label>
					<CustomSelect
						value={options.tone || "neutral"}
						onChange={(v) => onFieldChange("tone", v)}
						options={[
							{ value: "neutral", label: "😐 Neutral" },
							{ value: "friendly", label: "😊 Friendly" },
							{ value: "formal", label: "🎩 Formal" },
							{ value: "technical", label: "🔧 Technical" },
							{ value: "persuasive", label: "💫 Persuasive" },
						]}
					/>
				</div>
			</div>

			{/* Format & Tone preview cards */}
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{/* Format preview */}
				<div className="p-3 rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
					<div className="flex items-center gap-2 mb-2">
						<Icon
							name={currentFormat.icon as any}
							className="w-4 h-4 text-primary"
						/>
						<span className="text-xs font-semibold text-on-surface">
							{currentFormat.label}
						</span>
					</div>
					<p className="text-[10px] text-secondary mb-2">
						{currentFormat.description}
					</p>
					<pre className="text-[9px] font-mono p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-outline)]/50 text-secondary overflow-x-auto">
						{currentFormat.example}
					</pre>
				</div>

				{/* Tone preview */}
				<div className="p-3 rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
					<div className="flex items-center gap-2 mb-2">
						<span className="text-lg">{currentTone.emoji}</span>
						<span className="text-xs font-semibold text-on-surface">
							{currentTone.label} Tone
						</span>
					</div>
					<p className="text-[10px] text-secondary">
						{currentTone.description}
					</p>
				</div>
			</div>

			{/* Detail Level with visual word count */}
			<div>
				<label className="mb-1.5 block font-medium text-secondary text-xs">
					Detail Level
				</label>
				<div className="grid grid-cols-3 gap-2">
					{(Object.keys(DETAIL_LEVELS) as Array<keyof typeof DETAIL_LEVELS>).map(
						(level) => {
							const meta = DETAIL_LEVELS[level];
							const isSelected = (options.detail || "normal") === level;

							return (
								<button
									key={level}
									type="button"
									onClick={() => onFieldChange("detail", level)}
									className={`relative p-3 rounded-xl border transition-all duration-200 text-left ${
										isSelected
											? "border-primary bg-primary/10 shadow-md"
											: "border-[var(--color-outline)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-variant)] hover:border-primary/50"
									}`}
								>
									{/* Icon and label */}
									<div className="flex items-center gap-2 mb-1">
										<Icon
											name={meta.icon as any}
											className="w-3.5 h-3.5"
											style={{
												color: isSelected ? meta.color : "var(--color-secondary)",
											}}
										/>
										<span
											className={`text-xs font-semibold ${
												isSelected ? "text-primary" : "text-on-surface"
											}`}
										>
											{meta.label}
										</span>
									</div>

									{/* Word count badge */}
									<div
										className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
										style={{
											background: isSelected
												? `${meta.color}20`
												: "var(--color-surface-variant)",
											color: isSelected ? meta.color : "var(--color-secondary)",
										}}
									>
										{meta.words} words
									</div>

									{/* Description */}
									<p className="mt-1.5 text-[10px] text-secondary">
										{meta.description}
									</p>

									{/* Selected indicator */}
									{isSelected && (
										<div
											className="absolute top-2 right-2 w-2 h-2 rounded-full"
											style={{ background: meta.color }}
										/>
									)}
								</button>
							);
						},
					)}
				</div>
			</div>

			{/* Language */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label className="mb-1.5 block font-medium text-secondary text-xs">
						Output Language
					</label>
					<CustomSelect
						value={options.language || "English"}
						onChange={(v) => onFieldChange("language", v)}
						options={[
							{ value: "English", label: "🇬🇧 English" },
							{ value: "Dutch", label: "🇳🇱 Dutch" },
							{ value: "German", label: "🇩🇪 German" },
							{ value: "French", label: "🇫🇷 French" },
							{ value: "Spanish", label: "🇪🇸 Spanish" },
							{ value: "Arabic", label: "🇸🇦 Arabic" },
							{ value: "Mandarin", label: "🇨🇳 Mandarin" },
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
