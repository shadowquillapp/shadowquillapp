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
		<header className="flex items-center justify-between border-b border-[var(--color-outline)] bg-surface px-6 py-4">
			<div className="flex items-center gap-4">
				<button
					onClick={onBack}
					className="md-btn bg-transparent text-secondary transition-colors hover:bg-[var(--color-outline)] hover:text-light"
					aria-label="Back to Chat"
					title="Back to Chat"
				>
					<Icon name="chevron-left" className="text-base" />
					<span className="font-medium text-sm">Back</span>
				</button>

				<h1 className="flex items-center gap-3 font-semibold text-xl text-light">
					<Logo className="h-8 w-8 text-primary" />
					Preset Studio
					{isDirty && (
						<span
							className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--color-attention)]"
							title="Unsaved changes"
						/>
					)}
				</h1>
			</div>
		</header>
	);
}
