"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { readLocalModelConfig } from "@/lib/local-config";
import { Icon } from "./Icon";

interface ShadowQuillWindowApi {
	getPlatform?: () => Promise<string>;
	getSystemSpecs?: () => Promise<{
		cpu: string;
		ram: number;
		gpu: string;
	}>;
	window?: {
		close?: () => void;
		minimize?: () => void;
		maximizeToggle?: () => void;
	};
}

type WindowWithShadowQuill = Window & {
	shadowquill?: ShadowQuillWindowApi;
};

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
	const [_recommendation, setRecommendation] = useState<string | null>(null);
	const [currentModelId, setCurrentModelId] = useState<string | null>(null);

	useEffect(() => {
		// Detect platform on mount
		const detectPlatform = async () => {
			try {
				const win = window as WindowWithShadowQuill;
				const platformValue = await win.shadowquill?.getPlatform?.();
				setPlatform(platformValue || null);

				const specsValue = await win.shadowquill?.getSystemSpecs?.();
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

		// Helper to read model from config
		const syncModel = () => {
			try {
				const cfg = readLocalModelConfig();
				if (cfg && typeof cfg.model === "string") {
					setCurrentModelId(cfg.model);
					return true;
				}
			} catch {}
			return false;
		};

		// Load currently selected model
		syncModel();

		// Poll until model is found (handles initial setup delay)
		const pollId = setInterval(() => {
			if (syncModel()) clearInterval(pollId);
		}, 500);

		// Listen for model change broadcasts from elsewhere in the app
		const onModelChanged = (e: Event) => {
			try {
				const modelId = (e as CustomEvent<{ modelId?: string }>)?.detail
					?.modelId;
				if (typeof modelId === "string") setCurrentModelId(modelId);
			} catch {}
		};
		window.addEventListener("sq-model-changed", onModelChanged);
		window.addEventListener("storage", syncModel);
		window.addEventListener("focus", syncModel);
		return () => {
			clearInterval(pollId);
			window.removeEventListener("sq-model-changed", onModelChanged);
			window.removeEventListener("storage", syncModel);
			window.removeEventListener("focus", syncModel);
		};
	}, []);

	const isMac = platform === "darwin";
	const _isWindows = platform === "win32";

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
					(window as WindowWithShadowQuill).shadowquill?.window?.close?.();
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
					(window as WindowWithShadowQuill).shadowquill?.window?.minimize?.();
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
					(
						window as WindowWithShadowQuill
					).shadowquill?.window?.maximizeToggle?.();
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
			className={`flex items-center gap-2 px-2 font-medium text-[10px] ${isMac ? "mr-2" : "ml-2"}`}
		>
			<div className="flex items-center gap-2 rounded-full border border-transparent bg-white/0 px-2 py-0.5 text-zinc-500 transition-all hover:border-white/10 hover:bg-white/5 hover:text-zinc-300">
				<div className="flex items-center gap-1" title={`CPU: ${specs.cpu}`}>
					<span className="max-w-[100px] truncate">
						{cleanCpuName(specs.cpu)}
					</span>
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
			className={
				"mr-2 ml-1 flex items-center rounded-md px-1.5 py-0.5 font-bold text-[10px]"
			}
			style={{
				color: "var(--color-on-surface-variant)",
				background: "transparent",
			}}
			title={
				currentModelId
					? `Current model: ${currentModelId}`
					: "Model not configured"
			}
		>
			<span className="uppercase tracking-wide">
				{currentModelId
					? `Gemma 3 ${(currentModelId.split(":")[1] || "").toUpperCase()}`
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
