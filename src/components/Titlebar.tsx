"use client";

import type React from "react";
import { useEffect, useState } from "react";

const TitlebarButton: React.FC<{
	color: string;
	onClick: () => void;
	"aria-label": string;
}> = ({ color, onClick, "aria-label": ariaLabel }) => (
	<button
		type="button"
		aria-label={ariaLabel}
		onClick={onClick}
		className="titlebar-window-btn h-4 w-4 rounded-full"
		style={{ "--titlebar-btn-color": color } as React.CSSProperties}
	/>
);

export default function Titlebar() {
	const [platform, setPlatform] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const detectPlatform = async () => {
			try {
				const platformValue = await window.shadowquill?.getPlatform?.();
				if (mounted) setPlatform(platformValue || null);
			} catch {
				if (mounted) setPlatform(null);
			}
		};
		detectPlatform();

		return () => {
			mounted = false;
		};
	}, []);

	const isMac = platform === "darwin";

	const makeButton = (
		key: string,
		label: string,
		color: string,
		action: () => void,
	) => (
		<TitlebarButton
			key={key}
			aria-label={label}
			color={color}
			onClick={() => {
				try {
					action();
				} catch {}
			}}
		/>
	);

	const closeButton = makeButton(
		"close",
		"Close",
		"var(--palette-traffic-close)",
		() => {
			window.shadowquill?.window?.close?.();
		},
	);
	const minimizeButton = makeButton(
		"minimize",
		"Minimize",
		"var(--palette-traffic-minimize)",
		() => {
			window.shadowquill?.window?.minimize?.();
		},
	);
	const maximizeButton = makeButton(
		"maximize",
		"Maximize",
		"var(--palette-traffic-maximize)",
		() => {
			window.shadowquill?.window?.maximizeToggle?.();
		},
	);

	const buttons = isMac
		? [closeButton, minimizeButton, maximizeButton]
		: [minimizeButton, maximizeButton, closeButton];

	return (
		<div
			className="app-region-drag flex h-8 select-none items-center"
			style={{
				background: "var(--color-titlebar-background)",
				borderBottom: "1px solid var(--color-outline)",
				zIndex: 100,
			}}
		>
			{isMac && (
				<div className="app-region-no-drag ml-2 flex gap-2 px-2">{buttons}</div>
			)}

			<div className="flex-1" />

			{!isMac && (
				<div className="app-region-no-drag ml-auto flex gap-2 px-2">
					{buttons}
				</div>
			)}
		</div>
	);
}
