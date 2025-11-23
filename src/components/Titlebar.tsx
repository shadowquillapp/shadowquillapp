"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

const TitlebarButton: React.FC<{
	children: React.ReactNode;
	color: string;
	onClick: () => void;
	"aria-label": string;
}> = ({ children, color, onClick, "aria-label": ariaLabel }) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<button
			aria-label={ariaLabel}
			onClick={onClick}
			className="relative flex h-4 w-4 items-center justify-center overflow-hidden rounded-full shadow-sm"
			style={{
				backgroundColor: isHovered ? color : `${color}CC`,
				transition: "all 200ms ease",
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<div
					className="text-black"
					style={{
						opacity: isHovered ? 1 : 0,
						transform: `scale(${isHovered ? 1 : 0.7})`,
						transition: "all 150ms ease",
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
		// Detect platform on mount
		const detectPlatform = async () => {
			try {
				const platformValue = await (window as any).shadowquill?.getPlatform?.();
				setPlatform(platformValue || null);
			} catch {
				// Fallback: not in Electron or API not available
				setPlatform(null);
			}
		};
		detectPlatform();
	}, []);

	const isMac = platform === "darwin";

	// Define buttons
	const closeButton = (
		<TitlebarButton
			key="close"
			aria-label="Close"
			color="#FF5F57"
			onClick={() => {
				try {
					(window as any).shadowquill?.window?.close?.();
				} catch {}
			}}
		>
			<Icon name="close" className="h-2 w-2" />
		</TitlebarButton>
	);

	const minimizeButton = (
		<TitlebarButton
			key="minimize"
			aria-label="Minimize"
			color="#FFBD2E"
			onClick={() => {
				try {
					(window as any).shadowquill?.window?.minimize?.();
				} catch {}
			}}
		>
			<Icon name="minus" className="h-2 w-2" />
		</TitlebarButton>
	);

	const maximizeButton = (
		<TitlebarButton
			key="maximize"
			aria-label="Maximize"
			color="#28CA42"
			onClick={() => {
				try {
					(window as any).shadowquill?.window?.maximizeToggle?.();
				} catch {}
			}}
		>
			<Icon name="expand" className="h-2 w-2" />
		</TitlebarButton>
	);

	// Order buttons based on platform
	const buttons = isMac
		? [closeButton, minimizeButton, maximizeButton] // macOS order
		: [minimizeButton, maximizeButton, closeButton]; // Windows/Linux order

	return (
		<div
			className="app-region-drag flex h-8 select-none items-center"
			style={{
				background: "var(--color-titlebar-background)",
				borderBottom: "1px solid var(--color-outline)",
				zIndex: 100,
			}}
		>
			<div
				className={`app-region-no-drag flex gap-2 px-2 ${isMac ? "ml-2" : "ml-auto"}`}
			>
				{buttons}
			</div>
		</div>
	);
}
