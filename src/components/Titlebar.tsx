"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const TitlebarButton: React.FC<{
	children: React.ReactNode;
	color: string;
	onClick: () => void;
	"aria-label": string;
}> = ({ children, color, onClick, "aria-label": ariaLabel }) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<button
			type="button"
			aria-label={ariaLabel}
			onClick={onClick}
			className="relative flex h-4 w-4 items-center justify-center overflow-hidden rounded-full"
			style={{
				backgroundColor: isHovered ? color : `${color}CC`,
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<div
					className="text-black"
					style={{
						opacity: isHovered ? 1 : 0,
					}}
				>
					{children}
				</div>
			</div>
		</button>
	);
};

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
		icon: "close" | "minus" | "expand",
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
		>
			<Icon name={icon} className="h-2 w-2" />
		</TitlebarButton>
	);

	const closeButton = makeButton("close", "Close", "#FF5F57", "close", () => {
		window.shadowquill?.window?.close?.();
	});
	const minimizeButton = makeButton(
		"minimize",
		"Minimize",
		"#FFBD2E",
		"minus",
		() => {
			window.shadowquill?.window?.minimize?.();
		},
	);
	const maximizeButton = makeButton(
		"maximize",
		"Maximize",
		"#28CA42",
		"expand",
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
