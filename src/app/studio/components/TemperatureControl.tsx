"use client";

import { Icon } from "@/components/Icon";
import React, { useState, useMemo } from "react";

interface TemperatureControlProps {
	value: number;
	onChange: (value: number) => void;
}

/** Temperature preset suggestions */
const PRESETS = [
	{ value: 0.1, label: "Code", description: "Deterministic, factual" },
	{ value: 0.4, label: "Write", description: "Consistent but varied" },
	{ value: 0.7, label: "Chat", description: "Natural conversation" },
	{ value: 0.9, label: "Create", description: "Highly creative" },
] as const;

export default function TemperatureControl({
	value,
	onChange,
}: TemperatureControlProps) {
	const [showTooltip, setShowTooltip] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	// Determine semantic band with enhanced descriptions
	const band = useMemo(() => {
		if (value <= 0.2)
			return {
				name: "Precise",
				color: "blue",
				icon: "cpu",
				description: "Highly focused, repeatable outputs",
			};
		if (value <= 0.4)
			return {
				name: "Consistent",
				color: "cyan",
				icon: "check",
				description: "Reliable with minor variation",
			};
		if (value <= 0.6)
			return {
				name: "Balanced",
				color: "green",
				icon: "sliders",
				description: "Good mix of consistency and creativity",
			};
		if (value <= 0.8)
			return {
				name: "Creative",
				color: "yellow",
				icon: "sparkles",
				description: "More diverse, creative responses",
			};
		return {
			name: "Wild",
			color: "red",
			icon: "star",
			description: "Maximum creativity, less predictable",
		};
	}, [value]);

	// Heat gradient colors for the slider track
	const heatGradient = useMemo(() => {
		return `linear-gradient(to right, 
			#3b82f6 0%, 
			#06b6d4 20%, 
			#22c55e 40%, 
			#eab308 60%, 
			#f97316 80%, 
			#ef4444 100%)`;
	}, []);


	// Band color mapping
	const defaultColors = {
		text: "#22c55e",
		bg: "rgba(34, 197, 94, 0.15)",
		glow: "rgba(34, 197, 94, 0.3)",
	};

	const bandColors: Record<string, { text: string; bg: string; glow: string }> = {
		blue: {
			text: "#3b82f6",
			bg: "rgba(59, 130, 246, 0.15)",
			glow: "rgba(59, 130, 246, 0.3)",
		},
		cyan: {
			text: "#06b6d4",
			bg: "rgba(6, 182, 212, 0.15)",
			glow: "rgba(6, 182, 212, 0.3)",
		},
		green: defaultColors,
		yellow: {
			text: "#eab308",
			bg: "rgba(234, 179, 8, 0.15)",
			glow: "rgba(234, 179, 8, 0.3)",
		},
		red: {
			text: "#ef4444",
			bg: "rgba(239, 68, 68, 0.15)",
			glow: "rgba(239, 68, 68, 0.3)",
		},
	};

	const currentColors = bandColors[band.color] ?? defaultColors;

	return (
		<div className="space-y-3">
			{/* Header */}
			<div className="flex items-center justify-between">
				<label className="flex items-center gap-2 font-medium text-secondary text-xs">
					<span>Temperature</span>
				</label>

				{/* Current value display with band indicator */}
				<div className="flex items-center gap-2">
					<span
						className="rounded-full px-2.5 py-1 font-semibold text-xs flex items-center gap-1.5 transition-all duration-200"
						style={{
							background: currentColors.bg,
							color: currentColors.text,
							boxShadow: isDragging ? `0 0 12px ${currentColors.glow}` : "none",
						}}
					>
						<Icon name={band.icon as any} className="w-3 h-3" />
						{band.name}
					</span>
					<span
						className="font-mono text-sm font-bold px-2 py-0.5 rounded-md transition-all duration-200"
						style={{
							color: currentColors.text,
							background: isDragging ? currentColors.bg : "transparent",
						}}
					>
						{value.toFixed(2)}
					</span>
				</div>
			</div>

			{/* Slider with heat gradient */}
			<div className="relative pt-1">
				{/* Background track */}
				<div
					className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full opacity-30"
					style={{ background: heatGradient }}
				/>

				{/* Filled track - using overflow hidden container to clip gradient */}
				{value > 0 && (
					<div
						className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full overflow-hidden transition-all duration-75"
						style={{
							width: `${value * 100}%`,
						}}
					>
						{/* Inner gradient div spans full slider width so colors align */}
						<div
							className="h-full rounded-full"
							style={{
								width: `${(1 / value) * 100}%`,
								background: heatGradient,
							}}
						/>
					</div>
				)}

				{/* Actual input */}
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={value}
					onChange={(e) => onChange(Number.parseFloat(e.target.value))}
					onMouseDown={() => setIsDragging(true)}
					onMouseUp={() => setIsDragging(false)}
					onTouchStart={() => setIsDragging(true)}
					onTouchEnd={() => setIsDragging(false)}
					className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent"
					style={{
						// Custom thumb styling via CSS
						WebkitAppearance: "none",
					}}
				/>

				{/* Custom thumb indicator */}
				<div
					className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-75"
					style={{
						left: `${value * 100}%`,
					}}
				>
					<div
						className="w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform duration-150"
						style={{
							background: currentColors.text,
							transform: isDragging ? "scale(1.2)" : "scale(1)",
							boxShadow: `0 2px 8px ${currentColors.glow}, 0 0 0 2px white`,
						}}
					/>
				</div>
			</div>

		{/* Quick preset buttons */}
		<div className="flex gap-2">
			{PRESETS.map((preset) => (
				<button
					key={preset.value}
					type="button"
					onClick={() => onChange(preset.value)}
					className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 border ${
						Math.abs(value - preset.value) < 0.05
							? "border-primary bg-primary/10 text-primary"
							: "border-[var(--color-outline)] bg-[var(--color-surface-variant)] text-secondary hover:bg-[var(--color-surface)] hover:text-on-surface"
					}`}
					title={preset.description}
				>
					{preset.label}
				</button>
			))}
		</div>

			{/* Global styles for range input */}
			<style jsx>{`
				input[type="range"]::-webkit-slider-thumb {
					-webkit-appearance: none;
					width: 0;
					height: 0;
					opacity: 0;
				}
				input[type="range"]::-moz-range-thumb {
					width: 0;
					height: 0;
					opacity: 0;
					border: none;
				}
			`}</style>
		</div>
	);
}
