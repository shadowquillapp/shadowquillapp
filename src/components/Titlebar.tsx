"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { readLocalModelConfig } from "@/lib/local-config";

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
	const [specs, setSpecs] = useState<{
		cpu: string;
		ram: number;
		gpu: string;
	} | null>(null);
	const [recommendation, setRecommendation] = useState<string | null>(null);
	const [currentModelId, setCurrentModelId] = useState<string | null>(null);

	useEffect(() => {
		// Detect platform on mount
		const detectPlatform = async () => {
			try {
				const platformValue = await (
					window as any
				).shadowquill?.getPlatform?.();
				setPlatform(platformValue || null);

				const specsValue = await (
					window as any
				).shadowquill?.getSystemSpecs?.();
				if (specsValue) {
					setSpecs(specsValue);

					// Recommendation Logic
					const ramGB = specsValue.ram / (1024 * 1024 * 1024);
					if (ramGB < 16) {
						setRecommendation("gemma3:4b");
					} else if (ramGB < 40) {
						setRecommendation("gemma3:12b");
					} else {
						setRecommendation("gemma3:27b");
					}
				}
			} catch {
				// Fallback: not in Electron or API not available
				setPlatform(null);
			}
		};
		detectPlatform();

		// Load currently selected model
		try {
			const cfg = readLocalModelConfig();
			if (cfg && typeof cfg.model === "string") {
				setCurrentModelId(cfg.model);
			}
		} catch {}

		// Listen for model change broadcasts from elsewhere in the app
		const onModelChanged = (e: Event) => {
			try {
				const modelId = (e as CustomEvent)?.detail?.modelId as string | undefined;
				if (typeof modelId === "string") setCurrentModelId(modelId);
			} catch {}
		};
		window.addEventListener("sq-model-changed", onModelChanged as any);
		return () => window.removeEventListener("sq-model-changed", onModelChanged as any);
	}, []);

	const isMac = platform === "darwin";
	const isWindows = platform === "win32";

	// Filter out unwanted terms from CPU string
	const cleanCpuName = (cpuName: string) => {
		return cpuName
			.replace(/Intel®|Core™|Processor/gi, "")
			.replace(/\s+/g, " ")
			.trim();
	};

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

	const specsDisplay = specs && (
	<div
		className={`flex items-center gap-2 px-2 text-[10px] font-medium ${isMac ? "mr-2" : "ml-2"}`}
	>
		<div className="flex items-center gap-2 rounded-full bg-white/0 border border-transparent px-2 py-0.5 text-zinc-500 transition-all hover:bg-white/5 hover:border-white/10 hover:text-zinc-300">
			
			<div className="flex items-center gap-1" title={`CPU: ${specs.cpu}`}>
				<span className="max-w-[100px] truncate">{cleanCpuName(specs.cpu)}</span>
			</div>
			<div className="h-2.5 w-[1px] bg-white/10" />

			<div
				className="flex items-center gap-1"
				title={`RAM: ${(specs.ram / 1024 ** 3).toFixed(1)} GB`}
			>
				<span>{(specs.ram / 1024 ** 3).toFixed(0)} GB</span>
			</div>
			<div className="h-2.5 w-[1px] bg-white/10" />
			<div className="flex items-center gap-1" title={`GPU: ${specs.gpu}`}>
				<span className="max-w-[100px] truncate">{specs.gpu}</span>
			</div>
		</div>
	</div>
	);

	const modelChip = (
		<div
			className={`flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ml-1 mr-2`}
			style={{
				color: "var(--color-on-surface-variant)",
				background: "transparent",
			}}
			title={currentModelId ? `Current model: ${currentModelId}` : "Model not configured"}
		>
			<span className="uppercase tracking-wide">
				{currentModelId
					? `Gemma 3 ${(currentModelId.split(':')[1] || '').toUpperCase()}`
					: "Gemma 3 —"}
			</span>
		</div>
	);

	return (
		<div
			className="app-region-drag flex h-8 select-none items-center"
			style={{
				background: "var(--color-titlebar-background)",
				borderBottom: "1px solid var(--color-outline)",
				zIndex: 100,
			}}
		>
			{/* Mac: Buttons Left, Specs Right */}
			{isMac && (
				<>
					<div className="app-region-no-drag ml-2 flex gap-2 px-2">
						{buttons}
					</div>
					<div className="flex-1" />
					{specsDisplay}
					<div className="app-region-no-drag">{modelChip}</div>
				</>
			)}

			{/* Windows/Linux: Specs Left, Buttons Right */}
			{!isMac && (
				<>
					{specsDisplay}
					<div className="app-region-no-drag">{modelChip}</div>
					<div className="flex-1" />
					<div className="app-region-no-drag ml-auto flex gap-2 px-2">
						{buttons}
					</div>
				</>
			)}
		</div>
	);
}
