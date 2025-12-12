import { Icon } from "@/components/Icon";
import type { PromptPresetSummary } from "../types";

interface PresetInfoRowProps {
	preset: PromptPresetSummary;
	onClick: () => void;
}

/**
 * Preset information display card showing preset name, task type, and key options.
 */
export function PresetInfoRow({ preset, onClick }: PresetInfoRowProps) {
	const getIconName = (taskType: string) => {
		switch (taskType) {
			case "coding":
				return "git-compare";
			case "image":
				return "palette";
			case "video":
				return "eye";
			case "research":
				return "search";
			case "writing":
				return "edit";
			case "marketing":
				return "thumbsUp";
			default:
				return "folder-open";
		}
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: Cannot use <button> because it contains a nested <button> for editing
		<div
			role="button"
			tabIndex={0}
			className="flex cursor-pointer items-center rounded-xl text-left transition-all hover:opacity-90"
			style={{
				gap: "var(--space-3)",
				padding: "var(--space-3)",
				background:
					"linear-gradient(135deg, color-mix(in srgb, var(--color-primary), var(--color-surface-variant) 85%) 0%, var(--color-surface-variant) 100%)",
				border:
					"1px solid color-mix(in srgb, var(--color-primary), var(--color-outline) 70%)",
				boxShadow:
					"0 2px 8px color-mix(in srgb, var(--color-primary), transparent 85%)",
			}}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			title="Click for full preset details"
		>
			{/* Icon */}
			<div
				className="flex shrink-0 items-center justify-center"
				style={{
					color: "var(--color-primary)",
				}}
			>
				<Icon
					name={getIconName(preset.taskType)}
					style={{ width: 16, height: 16 }}
				/>
			</div>

			{/* Title & Type */}
			<div
				className="flex min-w-0 flex-1 items-center"
				style={{ gap: "var(--space-3)" }}
			>
				<span className="min-w-0 flex-1 truncate font-bold text-[13px] text-on-surface leading-tight">
					{preset.name}
				</span>

				{/* Tags Row */}
				<div
					className="flex shrink-0 flex-wrap items-center"
					style={{ gap: "var(--space-2)" }}
				>
					{/* Task Type Badge */}
					<span
						style={{
							fontSize: 9,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							color: "var(--color-primary)",
							opacity: 0.9,
						}}
					>
						{preset.taskType}
					</span>

					{/* Separator */}
					{(preset.options?.tone ||
						preset.options?.format ||
						preset.options?.detail ||
						typeof preset.options?.temperature === "number") && (
						<span style={{ opacity: 0.3, fontSize: 9 }}>•</span>
					)}

					{/* Metadata Tags - Inline */}
					{preset.options?.tone && (
						<span
							style={{
								fontSize: 9,
								color: "var(--color-on-surface-variant)",
								opacity: 0.7,
								textTransform: "capitalize",
							}}
						>
							{preset.options.tone}
						</span>
					)}
					{preset.options?.format && (
						<span
							style={{
								fontSize: 9,
								color: "var(--color-on-surface-variant)",
								opacity: 0.7,
							}}
						>
							{preset.options.format === "plain"
								? "Plain"
								: preset.options.format === "markdown"
									? "MD"
									: preset.options.format.toUpperCase()}
						</span>
					)}
					{preset.options?.detail && (
						<span
							style={{
								fontSize: 9,
								color: "var(--color-on-surface-variant)",
								opacity: 0.7,
								textTransform: "capitalize",
							}}
						>
							{preset.options.detail}
						</span>
					)}
					{typeof preset.options?.temperature === "number" && (
						<span
							style={{
								fontSize: 9,
								color: "var(--color-on-surface-variant)",
								opacity: 0.7,
								fontVariantNumeric: "tabular-nums",
							}}
						>
							{preset.options.temperature.toFixed(1)}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
