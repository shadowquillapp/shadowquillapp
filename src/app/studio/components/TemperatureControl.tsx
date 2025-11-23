"use client";

import { Icon } from "@/components/Icon";
import React, { useState } from "react";

interface TemperatureControlProps {
	value: number;
	onChange: (value: number) => void;
}

export default function TemperatureControl({
	value,
	onChange,
}: TemperatureControlProps) {
	const [showTooltip, setShowTooltip] = useState(false);

	// Determine semantic band
	const getBand = (val: number) => {
		if (val <= 0.3) return { name: "Precise", color: "blue" };
		if (val <= 0.7) return { name: "Balanced", color: "yellow" };
		return { name: "Creative", color: "purple" };
	};

	const band = getBand(value);

	// Band colors for styling
	const bandStyles: Record<string, { bg: string; text: string; border: string }> = {
		blue: {
			bg: "var(--color-surface-variant)",
			text: "var(--color-primary)",
			border: "var(--color-primary)",
		},
		yellow: {
			bg: "var(--color-surface-variant)",
			text: "var(--color-attention)",
			border: "var(--color-attention)",
		},
		purple: {
			bg: "var(--color-surface-variant)",
			text: "var(--color-save)",
			border: "var(--color-save)",
		},
	};

	const currentBandStyle = bandStyles[band.color] || bandStyles.blue!;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<label className="flex items-center gap-1 font-medium text-secondary text-xs">
					Temperature (Creativity)
					<div className="relative inline-block">
						<button
							type="button"
							onMouseEnter={() => setShowTooltip(true)}
							onMouseLeave={() => setShowTooltip(false)}
							onClick={() => setShowTooltip(!showTooltip)}
							className="p-0.5 text-secondary transition-colors hover:text-light"
							aria-label="Temperature information"
						>
							<Icon name="info" className="text-xs" />
						</button>
						{showTooltip && (
							<div className="-translate-x-1/2 absolute bottom-full left-1/2 z-20 mb-2 w-64 rounded-lg border border-[var(--color-outline)] bg-surface p-3 shadow-xl">
								<div className="space-y-1 text-xs text-light">
									<p className="font-medium">
										Temperature controls randomness:
									</p>
									<p>
										<span className="text-blue-500">0.0-0.3</span>: Focused,
										deterministic responses
									</p>
									<p>
										<span className="text-yellow-500">0.4-0.7</span>: Balanced
										creativity and consistency
									</p>
									<p>
										<span className="text-purple-500">0.8-1.0</span>: Creative,
										diverse outputs
									</p>
								</div>
								<div className="-translate-x-1/2 -mt-px absolute top-full left-1/2">
									<div className="h-2 w-2 rotate-45 transform border-r border-b border-[var(--color-outline)] bg-surface" />
								</div>
							</div>
						)}
					</div>
				</label>
				<span
					className="rounded-full border px-2 py-1 font-medium text-xs"
					style={{
						background: currentBandStyle.bg,
						color: currentBandStyle.text,
						borderColor: currentBandStyle.border,
					}}
				>
					{band.name}
				</span>
			</div>

			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<input
						type="range"
						min={0}
						max={1}
						step={0.05}
						value={value}
						onChange={(e) => onChange(Number.parseFloat(e.target.value))}
						className="h-2 w-full cursor-pointer appearance-none rounded-lg"
						style={{
							background: `linear-gradient(to right, 
                var(--color-primary) 0%, var(--color-primary) ${value * 100}%, 
                var(--color-outline) ${value * 100}%, var(--color-outline) 100%)`,
						}}
					/>
					{/* Value indicator */}
					<div
						className="-bottom-6 pointer-events-none absolute text-secondary text-xs"
						style={{ left: `${value * 100}%`, transform: "translateX(-50%)" }}
					>
						{value.toFixed(2)}
					</div>
				</div>
			</div>

			{/* Semantic markers */}
			<div className="mt-8 flex justify-between px-1 text-secondary text-xs opacity-70">
				<span>Precise</span>
				<span>Balanced</span>
				<span>Creative</span>
			</div>
		</div>
	);
}
