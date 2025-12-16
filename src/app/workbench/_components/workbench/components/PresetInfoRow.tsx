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

	const formatLabel = preset.options?.format
		? preset.options.format === "plain"
			? "Plain"
			: preset.options.format === "markdown"
				? "MD"
				: preset.options.format.toUpperCase()
		: null;

	const meta: Array<string> = [];
	if (preset.options?.tone) meta.push(preset.options.tone);
	if (formatLabel) meta.push(formatLabel);
	if (preset.options?.detail) meta.push(preset.options.detail);
	if (typeof preset.options?.temperature === "number") {
		meta.push(preset.options.temperature.toFixed(1));
	}

	// Keep the row compact: show only a few meta chips and summarize the rest.
	const MAX_META = 3;
	const visibleMeta = meta.slice(0, MAX_META);
	const hiddenMetaCount = Math.max(0, meta.length - visibleMeta.length);

	return (
		<button
			type="button"
			className="group flex w-full cursor-pointer items-center rounded-lg text-left transition-all hover:opacity-95 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--color-outline)]"
			style={{
				gap: 6,
				padding: "6px 8px",
				background:
					"color-mix(in srgb, var(--color-primary), var(--color-surface-variant) 92%)",
				border:
					"1px solid color-mix(in srgb, var(--color-outline), var(--color-primary) 30%)",
				boxShadow: "none",
			}}
			onClick={onClick}
			title="Click for full preset details"
		>
			{/* Icon */}
			<div
				className="flex shrink-0 items-center justify-center"
				style={{ color: "var(--color-primary)" }}
			>
				<Icon
					name={getIconName(preset.taskType)}
					style={{ width: 12, height: 12 }}
				/>
			</div>

			{/* Content - single line */}
			<div
				className="flex min-w-0 flex-1 items-center overflow-hidden"
				style={{ gap: 6 }}
			>
				<span className="shrink-0 font-bold text-[13px] text-on-surface leading-none">
					{preset.name}
				</span>
				<span
					className="shrink-0"
					style={{
						fontSize: 9,
						fontWeight: 800,
						textTransform: "uppercase",
						letterSpacing: "0.04em",
						color: "var(--color-primary)",
						background:
							"color-mix(in srgb, var(--color-primary), var(--color-surface) 92%)",
						border:
							"1px solid color-mix(in srgb, var(--color-primary), var(--color-outline) 70%)",
						padding: "1px 4px",
						borderRadius: 999,
						lineHeight: "11px",
					}}
				>
					{preset.taskType}
				</span>
				{/* Meta chips - inline */}
				{visibleMeta.map((item) => (
					<span
						key={item}
						className="shrink-0"
						style={{
							fontSize: 9,
							color: "var(--color-on-surface-variant)",
							opacity: 0.7,
							background:
								"color-mix(in srgb, var(--color-surface), var(--color-surface-variant) 80%)",
							border:
								"1px solid color-mix(in srgb, var(--color-outline), transparent 35%)",
							padding: "1px 4px",
							borderRadius: 999,
							lineHeight: "11px",
							textTransform:
								item === item.toUpperCase() ? "none" : "capitalize",
							fontVariantNumeric: "tabular-nums",
						}}
						title={item}
					>
						{item}
					</span>
				))}
				{hiddenMetaCount > 0 && (
					<span
						className="shrink-0"
						style={{
							fontSize: 9,
							color: "var(--color-on-surface-variant)",
							opacity: 0.6,
							fontWeight: 600,
						}}
					>
						+{hiddenMetaCount}
					</span>
				)}
			</div>

			{/* Chevron */}
			<div
				className="flex shrink-0 items-center justify-center"
				style={{
					color:
						"color-mix(in srgb, var(--color-on-surface-variant), transparent 25%)",
					transition: "transform 120ms ease",
					opacity: 0.75,
				}}
			>
				<Icon name="chevron-right" style={{ width: 12, height: 12 }} />
			</div>
		</button>
	);
}
