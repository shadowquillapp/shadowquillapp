import { Icon } from "@/components/Icon";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
import type { PromptPresetSummary } from "../types";

interface PresetInfoRowProps {
	preset: PromptPresetSummary;
	onClick: () => void;
}

export function PresetInfoRow({ preset, onClick }: PresetInfoRowProps) {
	const formatLabel = preset.options?.format
		? preset.options.format === "plain"
			? "Plain"
			: "MD"
		: null;

	const meta: Array<string> = [];
	if (preset.options?.tone) meta.push(preset.options.tone);
	if (formatLabel) meta.push(formatLabel);
	if (preset.options?.detail) meta.push(preset.options.detail);

	return (
		<button
			type="button"
			className="preset-info-row group fade-in-up"
			onClick={onClick}
			title="Click for full preset details"
		>
			<div
				className="flex shrink-0 items-center justify-center"
				style={{ color: "var(--color-primary)" }}
			>
				<Icon
					name={getTaskTypeIcon(preset.taskType)}
					style={{ width: 12, height: 12 }}
				/>
			</div>

			<div className="preset-info-row__meta">
				<span className="preset-info-row__name">{preset.name}</span>
				<div className="preset-info-row__tags">
					<span
						className="preset-info-row__tag shrink-0"
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
							padding: "2px 6px",
							borderRadius: 999,
							lineHeight: "12px",
						}}
					>
						{preset.taskType}
					</span>
					{meta.map((item) => (
						<span
							key={item}
							className="preset-info-row__tag shrink-0"
							style={{
								fontSize: 9,
								color: "var(--color-on-surface-variant)",
								opacity: 0.7,
								background:
									"color-mix(in srgb, var(--color-surface), var(--color-surface-variant) 80%)",
								border:
									"1px solid color-mix(in srgb, var(--color-outline), transparent 35%)",
								padding: "2px 6px",
								borderRadius: 999,
								lineHeight: "12px",
								textTransform:
									item === item.toUpperCase() ? "none" : "capitalize",
								fontVariantNumeric: "tabular-nums",
							}}
							title={item}
						>
							{item}
						</span>
					))}
				</div>
			</div>

			<div className="preset-info-row__chevron">
				<Icon name="chevron-right" style={{ width: 12, height: 12 }} />
			</div>
		</button>
	);
}
