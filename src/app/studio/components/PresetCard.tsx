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
			className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left ${
				isSelected
					? "border-primary"
					: "border-[var(--color-outline)] text-secondary hover:border-primary"
			}`}
			style={{
				background: isSelected
					? "var(--color-surface-variant)"
					: "var(--color-surface)",
			}}
			onMouseEnter={(e) => {
				if (!isSelected) {
					(e.currentTarget as HTMLElement).style.background =
						"var(--color-surface-variant)";
				}
			}}
			onMouseLeave={(e) => {
				if (!isSelected) {
					(e.currentTarget as HTMLElement).style.background =
						"var(--color-surface)";
				}
			}}
			onClick={onSelect}
			aria-label={`Select preset: ${preset.name}`}
			aria-pressed={isSelected}
		>
			<div
				className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
					isSelected ? "" : "text-secondary group-hover:text-light"
				}`}
				style={{
					background: isSelected
						? "var(--color-primary)"
						: "var(--color-surface-variant)",
					color: isSelected ? "var(--color-on-primary)" : undefined,
				}}
			>
				<Icon name={getTaskTypeIcon(taskType)} className="h-4 w-4" />
			</div>

			<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
				<span
					className={`truncate font-medium text-sm leading-tight ${
						isSelected ? "text-light" : "text-secondary group-hover:text-light"
					}`}
				>
					{preset.name}
				</span>
				<span className="shrink-0 text-[10px] text-secondary capitalize opacity-80">
					{taskType}
				</span>
			</div>

			{isSelected && (
				<div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)]" />
			)}
		</button>
	);
}
