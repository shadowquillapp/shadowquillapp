"use client";

import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import React from "react";

interface StudioHeaderProps {
	onNewPreset: () => void;
	onBack: () => void;
	isDirty?: boolean;
	isSmallScreen?: boolean;
	onToggleSidebar?: () => void;
}

export default function StudioHeader({
	onNewPreset,
	onBack,
	isDirty,
	isSmallScreen,
	onToggleSidebar,
}: StudioHeaderProps) {
	return (
		<header className="flex items-center justify-between border-b border-[var(--color-outline)] px-6 py-4" style={{ background: 'var(--surfacea20)' }}>
			<div className="flex items-center gap-4">
				{/* Hamburger menu for mobile */}
				{isSmallScreen && (
					<button
						className="md-btn flex items-center justify-center bg-transparent text-secondary transition-colors hover:bg-[var(--color-outline)] hover:text-light"
						style={{
							width: 36,
							height: 36,
							padding: 0,
						}}
						onClick={onToggleSidebar}
						title="Toggle sidebar"
					>
						<Icon name="bars" className="text-lg" />
					</button>
				)}

				<button
					onClick={onBack}
					className="md-btn flex h-[36px] items-center gap-2 bg-transparent px-3 text-secondary transition-colors hover:bg-[var(--color-outline)] hover:text-light"
					aria-label="Back to Chat"
					title="Back to Chat"
				>
					<Icon name="chevron-left" className="text-base" />
					<span className="font-medium text-sm">Back</span>
				</button>
			</div>

			<h1 className="flex items-center gap-3 font-semibold text-xl text-light">
				Preset Studio
				<Logo className="h-8 w-8 text-primary" />
				{isDirty && (
					<span
						className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--color-attention)]"
						title="Unsaved changes"
					/>
				)}
			</h1>
		</header>
	);
}
