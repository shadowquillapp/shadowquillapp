"use client";

import type React from "react";
import { useState } from "react";
import PresetCard from "@/app/studio/components/PresetCard";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";

interface PresetLibraryProps {
	presets: PresetLite[];
	selectedPresetId: string | null;
	onSelectPreset: (id: string) => void;
	onCreateNew?: () => void;
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

	return (
		<section className={className} style={style} aria-label="Preset Library">
			<div className="flex h-full flex-col">
				<div
					className="z-10 flex flex-col gap-4 border-[var(--color-outline)] border-b px-6 py-5"
					style={{ background: "var(--color-surface-variant)" }}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<h2 className="font-semibold text-lg text-light tracking-tight">
								Preset Library
							</h2>
							<span
								className="flex h-6 min-w-[24px] items-center justify-center rounded-full border border-[var(--color-outline)] px-2.5 font-semibold text-light text-xs shadow-sm"
								style={{ background: "var(--color-surface)" }}
							>
								{filteredPresets.length}
							</span>
						</div>
						{onCreateNew && (
							<button
								type="button"
								onClick={onCreateNew}
								className="md-btn md-btn--primary flex h-9 items-center gap-2 rounded-full px-4 font-medium text-sm shadow-md hover:shadow-lg"
								aria-label="Create new preset"
								title="Create new preset"
							>
								<Icon name="plus" className="h-4 w-4" />
							</button>
						)}
					</div>

					<div className="relative">
						<Icon
							name="search"
							className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-secondary"
						/>
						<input
							type="search"
							placeholder="Search presets..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-11 w-full rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] py-2 pr-4 pl-11 text-light text-sm placeholder:text-secondary/60 focus:outline-none"
							aria-label="Search presets"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{filteredPresets.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center p-6 text-center opacity-60">
							<Icon
								name="folder-open"
								className="mb-3 h-12 w-12 text-secondary"
							/>
							<p className="font-medium text-light text-sm">No presets found</p>
							<p className="mt-1 text-secondary text-xs">
								{searchQuery
									? "Try adjusting your search"
									: "Create a preset to get started"}
							</p>
						</div>
					) : (
						<ul className="list-none space-y-3">
							{filteredPresets.map((preset) => (
								<li key={preset.id || preset.name}>
									<PresetCard
										preset={preset}
										isSelected={selectedPresetId === preset.id}
										onSelect={() => onSelectPreset(preset.id || preset.name)}
									/>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
