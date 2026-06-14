"use client";

import { Icon } from "@/components/Icon";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
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
				style={{
					color: isSelected
						? "var(--color-on-surface)"
						: "var(--color-on-surface-variant)",
				}}
			/>
			<span
				className="data-table__cell data-table__cell--grow font-medium"
				style={{
					color: isSelected
						? "var(--color-on-surface)"
						: "var(--color-on-surface-variant)",
				}}
			>
				{preset.name}
			</span>
			<span
				className="data-table__cell data-table__cell--mono"
				style={{ fontSize: 10, opacity: 0.7 }}
			>
				{taskType}
			</span>
		</button>
	);
}
