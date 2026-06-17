"use client";

import { Icon } from "@/components/Icon";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
import { getTaskTypeLabel } from "@/lib/task-type-meta";
import type { PresetLite } from "@/types";

interface PresetCardProps {
	preset: PresetLite;
	isSelected: boolean;
	onSelect: () => void;
}

export default function PresetCard({
	preset,
	isSelected,
	onSelect,
}: PresetCardProps) {
	const taskType = preset.taskType || "intent";
	const textColor = isSelected
		? "var(--color-on-surface)"
		: "var(--color-on-surface-variant)";

	return (
		<button
			type="button"
			className={`data-table__row ${isSelected ? "data-table__row--selected" : ""}`}
			onClick={onSelect}
			aria-label={`Select preset: ${preset.name}`}
			aria-pressed={isSelected}
		>
			<Icon
				name={getTaskTypeIcon(taskType)}
				className="h-3.5 w-3.5 shrink-0"
				style={{ color: textColor }}
			/>
			<span
				className="data-table__cell data-table__cell--grow font-medium"
				style={{ color: textColor }}
			>
				{preset.name}
			</span>
			<span className="data-table__cell" style={{ fontSize: 11, opacity: 0.8 }}>
				{getTaskTypeLabel(taskType)}
			</span>
		</button>
	);
}
