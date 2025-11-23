"use client";

import type React from "react";
import { useState } from "react";
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
	return (
		<div
			className="app-region-drag fixed top-0 right-0 left-0 flex h-8 select-none items-center"
			style={{
				background: "var(--color-titlebar-background)",
				borderBottom: "1px solid var(--color-outline)",
				zIndex: 100,
			}}
		>
			<div className="app-region-no-drag ml-auto flex gap-2 px-2">
				<TitlebarButton
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
				<TitlebarButton
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
				<TitlebarButton
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
			</div>
		</div>
	);
}
