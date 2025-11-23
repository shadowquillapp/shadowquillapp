"use client";

import type { PresetLite } from "@/app/studio/types";
import { Icon } from "@/components/Icon";
import React from "react";

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
	const temperature = preset.options?.temperature ?? 0.7;

	const capitalize = (s: string | undefined) =>
		s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

	const taskType = preset.taskType || "general";
	const detailLabel = capitalize(preset.options?.detail || "normal");
	const formatMap: Record<string, string> = {
		markdown: "MD",
		plain: "TXT",
		xml: "XML",
	};
	const formatLabel =
		formatMap[preset.options?.format || "plain"] ||
		capitalize(preset.options?.format || "plain");

	// Map task types to icons
	const getIconForType = (type: string) => {
		switch (type) {
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

	const iconName = getIconForType(taskType);

	return (
		<button
			type="button"
			className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
				isSelected
					? "border-primary shadow-md"
					: "border-[var(--color-outline)] text-secondary hover:border-primary hover:shadow-md"
			}`}
			style={{
				background: isSelected ? 'var(--color-surface-variant)' : 'var(--surfacea10)'
			}}
			onMouseEnter={(e) => {
				if (!isSelected) {
					(e.currentTarget as HTMLElement).style.background = 'var(--color-surface-variant)';
				}
			}}
			onMouseLeave={(e) => {
				if (!isSelected) {
					(e.currentTarget as HTMLElement).style.background = 'var(--surfacea10)';
				}
			}}
			onClick={onSelect}
			aria-label={`Select preset: ${preset.name}`}
			aria-pressed={isSelected}
		>
		{/* Icon */}
		<div
			className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
				isSelected
					? "shadow-sm"
					: "text-secondary group-hover:text-light"
			}`}
			style={{
				background: isSelected ? 'var(--color-primary)' : 'var(--surfacea30)',
				color: isSelected ? 'var(--color-on-primary)' : undefined
			}}
		>
			<Icon name={iconName as any} className="text-xs" />
		</div>

			{/* Content */}
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex items-center justify-between gap-2 pb-1">
					<span
						className={`truncate font-medium text-sm leading-tight ${
							isSelected ? "text-light" : "text-secondary group-hover:text-light"
						}`}
					>
						{preset.name}
					</span>
				</div>

				<div className="flex items-center gap-2 text-[10px] text-secondary opacity-80 leading-tight">
					<span className="capitalize">{taskType}</span>
					<span className="text-[var(--color-outline)]">•</span>
					<span title={`Detail: ${preset.options?.detail || "Normal"}`}>
						{detailLabel}
					</span>
					<span className="text-[var(--color-outline)]">•</span>
					<span title={`Format: ${preset.options?.format || "Plain"}`}>
						{formatLabel}
					</span>
					<span className="text-[var(--color-outline)]">•</span>
					<span>{temperature.toFixed(1)}</span>
				</div>
			</div>

			{/* Selected Indicator (Subtle Dot) */}
			{isSelected && (
				<div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)]" />
			)}
		</button>
	);
}
