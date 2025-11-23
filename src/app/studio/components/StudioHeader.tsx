"use client";

import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import React from "react";

interface StudioHeaderProps {
	onNewPreset: () => void;
	onBack: () => void;
	isDirty?: boolean;
}

export default function StudioHeader({
	onNewPreset,
	onBack,
	isDirty,
}: StudioHeaderProps) {
	return (
		<header
			className="flex items-center justify-between px-6 py-4"
			style={{
				borderBottom: "1px solid var(--color-outline)",
				background: "var(--color-surface-variant)",
			}}
		>
			<div className="flex items-center gap-4">
				<button
					onClick={onBack}
					className="md-btn"
					style={{
						color: "var(--color-on-surface-variant)",
						background: "transparent",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = "var(--color-outline)";
						e.currentTarget.style.color = "var(--color-on-surface)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "transparent";
						e.currentTarget.style.color = "var(--color-on-surface-variant)";
					}}
					aria-label="Back to Chat"
					title="Back to Chat"
				>
					<Icon name="chevron-left" className="text-base" />
					<span className="font-medium text-sm">Back</span>
				</button>

				<h1
					className="flex items-center gap-3 font-semibold text-xl"
					style={{ color: "var(--color-on-surface)" }}
				>
					<Logo className="h-8 w-8 text-[var(--color-primary)]" />
					Preset Studio
					{isDirty && (
						<span
							className="ml-2 inline-block h-2 w-2 rounded-full"
							style={{ background: "var(--color-attention)" }}
							title="Unsaved changes"
						/>
					)}
				</h1>
			</div>
		</header>
	);
}
