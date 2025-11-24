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
		<header
			className="flex items-center justify-between border-b border-[var(--color-outline)]"
			style={{
				background: "var(--color-surface-variant)",
				padding: "8px 12px",
				gap: "8px",
				flexWrap: "nowrap",
				minHeight: "48px",
			}}
		>
			<div className="flex items-center" style={{ gap: 8 }}>
				{/* Hamburger menu for mobile */}
				{isSmallScreen && (
					<button
						className="md-btn flex items-center justify-center bg-transparent text-secondary transition-colors hover:bg-[var(--color-outline)] hover:text-light"
						style={{
							width: 32,
							height: 32,
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
					className="md-btn flex items-center bg-transparent px-3 text-secondary transition-colors hover:bg-[var(--color-outline)] hover:text-light"
					style={{ height: 32, gap: 8 }}
					aria-label="Back to Chat"
					title="Back to Chat"
				>
					<Icon name="chevron-left" className="text-base" />
					<span className="font-medium text-sm">Back</span>
				</button>
			</div>

			<h1 className="flex items-center font-semibold text-sm text-on-surface" style={{ gap: 8 }}>
				Preset Studio
				<Logo className="h-6 w-6 text-primary" />
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
