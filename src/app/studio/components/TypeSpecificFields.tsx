"use client";

import { CustomSelect } from "@/components/CustomSelect";
import type { PresetOptions, TaskType } from "@/types";

interface TypeSpecificFieldsProps {
	taskType: TaskType;
	options: PresetOptions;
	onFieldChange: (field: string, value: unknown) => void;
}

export default function TypeSpecificFields({
	taskType,
	options,
	onFieldChange,
}: TypeSpecificFieldsProps) {
	if (taskType === "general") return null;

	if (taskType === "image") {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label
						htmlFor="image-style"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Image Style
					</label>
					<CustomSelect
						id="image-style"
						value={options.stylePreset || "photorealistic"}
						onChange={(v) => onFieldChange("stylePreset", v)}
						options={[
							{ value: "photorealistic", label: "Photorealistic" },
							{ value: "illustration", label: "Illustration" },
							{ value: "3d", label: "3D Render" },
							{ value: "anime", label: "Anime" },
							{ value: "watercolor", label: "Watercolor" },
						]}
					/>
				</div>
				<div>
					<label
						htmlFor="image-aspect-ratio"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Aspect Ratio
					</label>
					<CustomSelect
						id="image-aspect-ratio"
						value={options.aspectRatio || "1:1"}
						onChange={(v) => onFieldChange("aspectRatio", v)}
						options={[
							{ value: "1:1", label: "1:1 Square" },
							{ value: "16:9", label: "16:9 Landscape" },
							{ value: "9:16", label: "9:16 Portrait" },
							{ value: "4:3", label: "4:3 Classic" },
						]}
					/>
				</div>
			</div>
		);
	}

	if (taskType === "video") {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div>
					<label
						htmlFor="video-style"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Video Style
					</label>
					<CustomSelect
						id="video-style"
						value={options.stylePreset || "cinematic"}
						onChange={(v) => onFieldChange("stylePreset", v)}
						options={[
							{ value: "cinematic", label: "Cinematic" },
							{ value: "documentary", label: "Documentary" },
							{ value: "animation", label: "Animation" },
							{ value: "timelapse", label: "Timelapse" },
							{ value: "vlog", label: "Vlog" },
							{ value: "commercial", label: "Commercial" },
							{ value: "anime", label: "Anime" },
						]}
					/>
				</div>
				<div>
					<label
						htmlFor="video-aspect-ratio"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Aspect Ratio
					</label>
					<CustomSelect
						id="video-aspect-ratio"
						value={options.aspectRatio || "16:9"}
						onChange={(v) => onFieldChange("aspectRatio", v)}
						options={[
							{ value: "1:1", label: "1:1 Square" },
							{ value: "16:9", label: "16:9 Landscape" },
							{ value: "9:16", label: "9:16 Portrait" },
							{ value: "4:3", label: "4:3 Classic" },
						]}
					/>
				</div>
				<div>
					<label
						htmlFor="duration-seconds"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Duration (seconds)
					</label>
					<input
						id="duration-seconds"
						type="number"
						min={1}
						max={60}
						value={options.durationSeconds || 5}
						onChange={(e) => {
							const val = Math.max(
								1,
								Math.min(60, Number.parseInt(e.target.value, 10) || 5),
							);
							onFieldChange("durationSeconds", val);
						}}
						className="md-input !rounded-lg h-10 w-full px-3 py-2 text-sm"
					/>
				</div>
			</div>
		);
	}

	if (taskType === "coding") {
		return (
			<div className="space-y-4">
				<div>
					<label
						htmlFor="tech-stack"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Tech Stack
					</label>
					<textarea
						id="tech-stack"
						value={options.techStack || ""}
						onChange={(e) => onFieldChange("techStack", e.target.value)}
						placeholder="e.g., React, TypeScript, Node.js"
						className="md-input w-full resize-none px-3 py-2 text-sm"
						rows={2}
					/>
				</div>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={options.includeTests ?? true}
						onChange={(e) => onFieldChange("includeTests", e.target.checked)}
						className="md-checkbox"
					/>
					<span className="text-light text-sm">Include test requirements</span>
				</label>
			</div>
		);
	}

	if (taskType === "research") {
		return (
			<label className="flex cursor-pointer items-center gap-2">
				<input
					type="checkbox"
					checked={options.requireCitations ?? true}
					onChange={(e) => onFieldChange("requireCitations", e.target.checked)}
					className="md-checkbox"
				/>
				<span className="text-light text-sm">Require citations</span>
			</label>
		);
	}

	if (taskType === "writing") {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label
						htmlFor="writing-style"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Writing Style
					</label>
					<CustomSelect
						id="writing-style"
						value={options.writingStyle || "narrative"}
						onChange={(v) => onFieldChange("writingStyle", v)}
						options={[
							{ value: "narrative", label: "Narrative" },
							{ value: "expository", label: "Expository" },
							{ value: "technical", label: "Technical" },
							{ value: "descriptive", label: "Descriptive" },
						]}
					/>
				</div>
				<div>
					<label
						htmlFor="point-of-view"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Point of View
					</label>
					<CustomSelect
						id="point-of-view"
						value={options.pointOfView || "third"}
						onChange={(v) => onFieldChange("pointOfView", v)}
						options={[
							{ value: "first", label: "First person" },
							{ value: "second", label: "Second person" },
							{ value: "third", label: "Third person" },
						]}
					/>
				</div>
			</div>
		);
	}

	if (taskType === "marketing") {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label
						htmlFor="marketing-channel"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Marketing Channel
					</label>
					<CustomSelect
						id="marketing-channel"
						value={options.marketingChannel || "landing_page"}
						onChange={(v) => onFieldChange("marketingChannel", v)}
						options={[
							{ value: "landing_page", label: "Landing Page" },
							{ value: "email", label: "Email" },
							{ value: "social", label: "Social" },
							{ value: "ad", label: "Ad" },
						]}
					/>
				</div>
				<div>
					<label
						htmlFor="cta-style"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						CTA Style
					</label>
					<CustomSelect
						id="cta-style"
						value={options.ctaStyle || "standard"}
						onChange={(v) => onFieldChange("ctaStyle", v)}
						options={[
							{ value: "soft", label: "Soft" },
							{ value: "standard", label: "Standard" },
							{ value: "strong", label: "Strong" },
						]}
					/>
				</div>
			</div>
		);
	}

	return null;
}
