"use client";

import type React from "react";
import { useState } from "react";
import PresetCard from "@/app/studio/components/PresetCard";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";

interface PresetLibraryProps {
	presets: PresetLite[];
	selectedPresetId: string | null;
	onSelectPreset: (id: string) => void | Promise<void>;
	onCreateNew?: () => void | Promise<void>;
	className?: string;
	style?: React.CSSProperties;
}

export default function PresetLibrary({
	presets,
	selectedPresetId,
	onSelectPreset,
	onCreateNew,
	className = "",
	style,
}: PresetLibraryProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredPresets = presets
		.filter((preset) => {
			const query = searchQuery.toLowerCase();
			return (
				preset.name.toLowerCase().includes(query) ||
				preset.taskType.toLowerCase().includes(query)
			);
		})
		.sort((a, b) => a.name.localeCompare(b.name));
	const selectedPreset = selectedPresetId
		? presets.find((preset) => preset.id === selectedPresetId)
		: null;
	const selectedHidden = Boolean(
		selectedPreset &&
			searchQuery &&
			!filteredPresets.some((preset) => preset.id === selectedPresetId),
	);

	return (
		<section className={className} style={style} aria-label="Preset Library">
			<div className="flex h-full flex-col">
				<div
					className="z-10 flex flex-col gap-2 border-[var(--color-outline)] border-b px-3 py-2"
					style={{ background: "var(--color-panel-head)" }}
				>
					<div className="flex items-center justify-between gap-2">
						<div className="flex min-w-0 items-center gap-2">
							<h2
								className="truncate font-semibold text-light text-xs uppercase"
								style={{ letterSpacing: "var(--label-tracking)" }}
							>
								Preset Library
							</h2>
							<span
								className="flex h-5 min-w-[20px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-outline)] px-1.5 font-mono text-[10px] text-light"
								style={{ background: "var(--color-surface)" }}
							>
								{filteredPresets.length}
							</span>
						</div>
						{onCreateNew && (
							<button
								type="button"
								onClick={onCreateNew}
								className="md-btn md-btn--primary md-btn--label"
								aria-label="Create new preset"
								title="Create new preset"
							>
								<Icon name="plus" className="h-3.5 w-3.5" />
								New
							</button>
						)}
					</div>

					<input
						type="search"
						placeholder="Filter presets..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="md-input h-8 w-full"
						aria-label="Search presets"
					/>
				</div>

				<div className="flex-1 overflow-y-auto">
					{filteredPresets.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center p-6 text-center opacity-60">
							<Icon
								name="folder-open"
								className="mb-3 h-10 w-10 text-secondary"
							/>
							<p className="font-medium text-light text-sm">No presets found</p>
							<p className="mt-1 text-secondary text-xs">
								{selectedHidden
									? `${selectedPreset?.name} is still open in the editor.`
									: searchQuery
										? "Try adjusting your search"
										: "Create a preset to get started"}
							</p>
						</div>
					) : (
						<div className="data-table data-table--flush">
							<div className="data-table__head-row">
								<span className="data-table__cell data-table__cell--grow">
									Name
								</span>
								<span className="data-table__cell">Type</span>
							</div>
							{filteredPresets.map((preset) => (
								<PresetCard
									key={preset.id || preset.name}
									preset={preset}
									isSelected={
										selectedPresetId === (preset.id || preset.name) ||
										selectedPresetId === preset.name
									}
									onSelect={() => void onSelectPreset(preset.id || preset.name)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
