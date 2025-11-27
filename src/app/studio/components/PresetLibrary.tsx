"use client";

import PresetCard from "@/app/studio/components/PresetCard";
import type { PresetLite } from "@/types";
import { CustomSelect } from "@/components/CustomSelect";
import { Icon } from "@/components/Icon";
import type React from "react";
import { useState } from "react";

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
	const [showFilters, setShowFilters] = useState(false);
	const [typeFilter, setTypeFilter] = useState<
		| "all"
		| "general"
		| "coding"
		| "image"
		| "video"
		| "research"
		| "writing"
		| "marketing"
	>("all");
	const [sortBy, setSortBy] = useState<"name" | "temperature">("name");

	// Filter + sort presets
	const filteredPresets = presets
		.filter((preset) =>
			typeFilter === "all" ? true : preset.taskType === typeFilter,
		)
		.filter((preset) => {
			const query = searchQuery.toLowerCase();
			return (
				preset.name.toLowerCase().includes(query) ||
				preset.taskType.toLowerCase().includes(query)
			);
		})
		.sort((a, b) => {
			if (sortBy === "name") return a.name.localeCompare(b.name);
			const at = a.options?.temperature ?? 0;
			const bt = b.options?.temperature ?? 0;
			return at - bt;
		});

	return (
		<section
			className={className}
			style={style}
			aria-label="Preset Library"
		>
			<div className="flex h-full flex-col">
			{/* Fixed Header - Material Design Top App Bar style */}
			<div className="z-10 flex flex-col gap-4 border-b border-[var(--color-outline)] px-6 py-5" style={{ background: 'var(--color-surface-variant)' }}>
				{/* Title & Action */}
				<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				<h2 className="font-semibold text-lg text-light tracking-tight">
					Preset Library
				</h2>
				<span className="flex h-6 min-w-[24px] items-center justify-center rounded-full border border-[var(--color-outline)] px-2.5 font-semibold text-light text-xs shadow-sm" style={{ background: 'var(--color-surface)' }}>
					{filteredPresets.length}
				</span>
			</div>
						{onCreateNew && (
							<button
								onClick={onCreateNew}
								className="md-btn md-btn--primary flex h-9 items-center gap-2 rounded-full px-4 font-medium text-sm shadow-md hover:shadow-lg"
								aria-label="Create new preset"
								title="Create new preset"
							>
								<Icon name="plus" className="text-xs" />
							</button>
						)}
					</div>

		{/* Search Bar - Material Filled Input style */}
		<div className="relative">
			<div className="relative flex items-center rounded-2xl border border-[var(--color-outline)] transition-colors hover:bg-[var(--color-surface)]" style={{ background: 'var(--color-surface)' }}>
				<Icon
					name="search"
					className="absolute left-4 text-secondary text-sm"
				/>
				<input
					type="search"
					placeholder="Search presets..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="h-11 w-full bg-transparent py-2 pl-11 pr-11 text-light text-sm placeholder:text-secondary/60 focus:outline-none"
					aria-label="Search presets"
				/>
				<button
					onClick={() => setShowFilters(!showFilters)}
					className={`absolute right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors ${
						showFilters
							? "bg-primary text-on-primary"
							: "text-secondary hover:bg-[var(--color-outline)] hover:text-light"
					}`}
					title="Filter & Sort"
				>
					<Icon name="sliders" className="text-xs" />
				</button>
			</div>
		</div>

					{/* Expandable Filters Area */}
					{showFilters && (
						<div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
							<div className="space-y-1">
								<label className="ml-1 text-[10px] text-secondary uppercase tracking-wider font-semibold">
									Type
								</label>
								<CustomSelect
									value={typeFilter}
									onChange={(v) => setTypeFilter(v as any)}
									options={[
										{ value: "all", label: "All Types" },
										{ value: "general", label: "General" },
										{ value: "coding", label: "Coding" },
										{ value: "image", label: "Image" },
										{ value: "video", label: "Video" },
										{ value: "research", label: "Research" },
										{ value: "writing", label: "Writing" },
										{ value: "marketing", label: "Marketing" },
									]}
								/>
							</div>
							<div className="space-y-1">
								<label className="ml-1 text-[10px] text-secondary uppercase tracking-wider font-semibold">
									Sort By
								</label>
								<CustomSelect
									value={sortBy}
									onChange={(v) => setSortBy(v as any)}
									options={[
										{ value: "name", label: "Name" },
										{ value: "temperature", label: "Temp" },
									]}
								/>
							</div>
						</div>
					)}
				</div>

				{/* List Container */}
				<div className="flex-1 overflow-y-auto p-4">
					{filteredPresets.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center p-6 text-center opacity-60">
							<Icon name="folder-open" className="mb-3 text-4xl text-secondary" />
							<p className="font-medium text-light text-sm">No presets found</p>
							<p className="mt-1 text-secondary text-xs">
								{searchQuery
									? "Try adjusting your search"
									: "Create a preset to get started"}
							</p>
						</div>
					) : (
						<div role="list" className="space-y-3">
							{filteredPresets.map((preset) => (
								<PresetCard
									key={preset.id || preset.name}
									preset={preset}
									isSelected={selectedPresetId === preset.id}
									onSelect={() => onSelectPreset(preset.id || preset.name)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
