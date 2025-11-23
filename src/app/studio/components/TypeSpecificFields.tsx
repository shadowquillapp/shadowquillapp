"use client";

import type { PresetOptions, TaskType } from "@/app/studio/types";
import { CustomSelect } from "@/components/CustomSelect";
import React from "react";

interface TypeSpecificFieldsProps {
	taskType: TaskType;
	options: PresetOptions;
	onFieldChange: (field: string, value: any) => void;
}

export default function TypeSpecificFields({
	taskType,
	options,
	onFieldChange,
}: TypeSpecificFieldsProps) {
	// Image-specific fields
	if (taskType === "image") {
		return (
			<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Image Style
					</label>
					<CustomSelect
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
					<label className="mb-1 block font-medium text-secondary text-xs">
						Aspect Ratio
					</label>
					<CustomSelect
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

	// Video-specific fields
	if (taskType === "video") {
		return (
			<div className="mt-4 space-y-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Video Style
						</label>
						<CustomSelect
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
						<label className="mb-1 block font-medium text-secondary text-xs">
							Aspect Ratio
						</label>
						<CustomSelect
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
						<label className="mb-1 block font-medium text-secondary text-xs">
							Camera Movement
						</label>
						<CustomSelect
							value={options.cameraMovement || "static"}
							onChange={(v) => onFieldChange("cameraMovement", v)}
							options={[
								{ value: "static", label: "Static" },
								{ value: "pan", label: "Pan" },
								{ value: "tilt", label: "Tilt" },
								{ value: "dolly", label: "Dolly" },
								{ value: "zoom", label: "Zoom" },
								{ value: "handheld", label: "Handheld" },
								{ value: "tracking", label: "Tracking" },
							]}
						/>
					</div>

					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Shot Type
						</label>
						<CustomSelect
							value={options.shotType || "medium"}
							onChange={(v) => onFieldChange("shotType", v)}
							options={[
								{ value: "wide", label: "Wide" },
								{ value: "medium", label: "Medium" },
								{ value: "close_up", label: "Close-up" },
								{ value: "over_the_shoulder", label: "Over-the-shoulder" },
								{ value: "first_person", label: "First-person" },
							]}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Duration (seconds)
						</label>
						<input
							type="number"
							min={1}
							max={60}
							value={options.durationSeconds || 5}
							onChange={(e) => {
								const val = Math.max(
									1,
									Math.min(60, Number.parseInt(e.target.value) || 5),
								);
								onFieldChange("durationSeconds", val);
							}}
							className="md-input w-full h-10 !rounded-lg py-2 px-3 text-sm"
						/>
					</div>

					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Frame Rate
						</label>
						<CustomSelect
							value={String(options.frameRate || 24)}
							onChange={(v) => onFieldChange("frameRate", Number.parseInt(v))}
							options={[
								{ value: "24", label: "24 fps (Cinematic)" },
								{ value: "30", label: "30 fps (Standard)" },
								{ value: "60", label: "60 fps (Smooth)" },
							]}
						/>
					</div>
				</div>
			</div>
		);
	}

	// Coding-specific fields
	if (taskType === "coding") {
		return (
			<div className="mt-4 space-y-4">
				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Tech Stack (Required) <span className="text-red-500">*</span>
					</label>
					<textarea
						value={(options as any).techStack || ""}
						onChange={(e) => onFieldChange("techStack", e.target.value)}
						placeholder="e.g., 'React, TypeScript, Node.js, PostgreSQL'. MUST specify the technologies to be used."
						className="md-input w-full resize-none py-2 px-3 text-sm"
						rows={2}
					/>
					<p className="mt-1 text-xs text-secondary opacity-80">
						Specify technologies/frameworks. The prompt will STRICTLY restrict itself to this stack.
					</p>
				</div>

				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Project Context (Optional)
					</label>
					<textarea
						value={(options as any).projectContext || ""}
						onChange={(e) => onFieldChange("projectContext", e.target.value)}
						placeholder="Optional context: existing architecture, coding standards, design patterns you want followed, etc."
						className="md-input w-full resize-none py-2 px-3 text-sm"
						rows={3}
					/>
					<p className="mt-1 text-xs text-secondary opacity-80">
						Additional project-specific context to guide the implementation.
					</p>
				</div>

				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Specific Constraints (Optional)
					</label>
					<textarea
						value={(options as any).codingConstraints || ""}
						onChange={(e) => onFieldChange("codingConstraints", e.target.value)}
						placeholder="Performance requirements, security considerations, accessibility needs, etc."
						className="md-input w-full resize-none py-2 px-3 text-sm"
						rows={2}
					/>
					<p className="mt-1 text-xs text-secondary opacity-80">
						Specific technical constraints or requirements.
					</p>
				</div>

				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={options.includeTests ?? true}
						onChange={(e) => onFieldChange("includeTests", e.target.checked)}
						className="md-checkbox"
					/>
					<span className="text-sm text-light">Include test requirements</span>
				</label>
				<p className="mt-1 ml-6 text-xs text-secondary opacity-80">
					Add testing requirements to the prompt
				</p>
			</div>
		);
	}

	// Research-specific fields
	if (taskType === "research") {
		return (
			<div className="mt-4">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={options.requireCitations ?? true}
						onChange={(e) =>
							onFieldChange("requireCitations", e.target.checked)
						}
						className="md-checkbox"
					/>
					<span className="text-sm text-light">Require citations</span>
				</label>
				<p className="mt-1 ml-6 text-xs text-secondary opacity-80">
					Include source references and citations in the response
				</p>
			</div>
		);
	}

	// Writing-specific fields
	if (taskType === "writing") {
		return (
			<div className="mt-4 space-y-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Writing Style
						</label>
						<CustomSelect
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
						<label className="mb-1 block font-medium text-secondary text-xs">
							Point of View
						</label>
						<CustomSelect
							value={options.pointOfView || "third"}
							onChange={(v) => onFieldChange("pointOfView", v)}
							options={[
								{ value: "first", label: "First person" },
								{ value: "second", label: "Second person" },
								{ value: "third", label: "Third person" },
							]}
						/>
					</div>

					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Reading Level
						</label>
						<CustomSelect
							value={options.readingLevel || "intermediate"}
							onChange={(v) => onFieldChange("readingLevel", v)}
							options={[
								{ value: "basic", label: "Basic" },
								{ value: "intermediate", label: "Intermediate" },
								{ value: "expert", label: "Expert" },
							]}
						/>
					</div>

					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Target Word Count
						</label>
						<input
							type="number"
							min={50}
							max={5000}
							step={50}
							value={options.targetWordCount || 800}
							onChange={(e) =>
								onFieldChange(
									"targetWordCount",
									Math.max(
										50,
										Math.min(5000, Number.parseInt(e.target.value) || 800),
									),
								)
							}
							className="md-input w-full h-10 !rounded-lg py-2 px-3 text-sm"
						/>
					</div>
				</div>

			<label className="flex cursor-pointer items-center gap-2">
				<input
					type="checkbox"
					checked={options.includeHeadings ?? true}
					onChange={(e) => onFieldChange("includeHeadings", e.target.checked)}
					className="md-checkbox"
				/>
				<span className="text-sm text-light">
					Include section headings
				</span>
			</label>
			</div>
		);
	}

	// Marketing-specific fields
	if (taskType === "marketing") {
		return (
			<div className="mt-4 space-y-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="mb-1 block font-medium text-secondary text-xs">
							Marketing Channel
						</label>
						<CustomSelect
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
						<label className="mb-1 block font-medium text-secondary text-xs">
							CTA Style
						</label>
						<CustomSelect
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

				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Value Propositions
					</label>
					<textarea
						value={options.valueProps || ""}
						onChange={(e) => onFieldChange("valueProps", e.target.value)}
						placeholder="List key value props, proof points, differentiators."
						className="md-input w-full resize-none py-2 px-3 text-sm"
						rows={3}
					/>
				</div>

				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Compliance Notes
					</label>
					<textarea
						value={options.complianceNotes || ""}
						onChange={(e) => onFieldChange("complianceNotes", e.target.value)}
						placeholder="Disclaimers or constraints to follow precisely."
						className="md-input w-full resize-none py-2 px-3 text-sm"
						rows={3}
					/>
				</div>
			</div>
		);
	}

	return null;
}
