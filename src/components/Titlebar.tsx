"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
	formatOllamaModelName,
	readLocalModelConfig,
} from "@/lib/local-config";
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
	const [specs, setSpecs] = useState<{
		cpu: string;
		ram: number;
		gpu: string;
	} | null>(null);
	const [currentModelId, setCurrentModelId] = useState<string | null>(null);

	useEffect(() => {
		const detectPlatform = async () => {
			try {
				const platformValue = await window.shadowquill?.getPlatform?.();
				setPlatform(platformValue || null);

				const specsValue = await window.shadowquill?.getSystemSpecs?.();
				if (specsValue) {
					setSpecs(specsValue);
				}
			} catch {
				setPlatform(null);
			}
		};
		detectPlatform();

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

		syncModel();

		const pollId = setInterval(() => {
			if (syncModel()) clearInterval(pollId);
		}, 500);

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

	const cleanCpuName = (cpuName: string) => {
		return cpuName
			.replace(/Intel®|Core™|Processor/gi, "")
			.replace(/\s+/g, " ")
			.trim();
	};

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

	const specsDisplay = specs && (
		<div
			className={`flex items-center gap-2 px-2 font-medium text-[10px] ${isMac ? "mr-2" : "ml-2"}`}
		>
			<div className="flex items-center gap-2 rounded-full border border-transparent bg-transparent px-2 py-0.5 text-[var(--color-on-surface-variant)] transition-colors hover:border-[var(--color-outline)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]">
				<div
					className={
						"flex items-center rounded-md py-0.5 font-bold text-[10px]"
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
						{currentModelId ? formatOllamaModelName(currentModelId) : "Gemma —"}
					</span>
				</div>
				<div
					className="h-2.5 w-[1px]"
					style={{
						backgroundColor: "var(--color-outline)",
					}}
				/>
				<div className="flex items-center gap-1" title={`CPU: ${specs.cpu}`}>
					<span className="max-w-[100px] truncate">
						{cleanCpuName(specs.cpu)}
					</span>
				</div>
				<div
					className="h-2.5 w-[1px]"
					style={{
						backgroundColor: "var(--color-outline)",
					}}
				/>

				<div
					className="flex items-center gap-1"
					title={`RAM: ${(specs.ram / 1024 ** 3).toFixed(1)} GB`}
				>
					<span>{(specs.ram / 1024 ** 3).toFixed(0)} GB</span>
				</div>
				<div
					className="h-2.5 w-[1px]"
					style={{
						backgroundColor: "var(--color-outline)",
					}}
				/>
				<div className="flex items-center gap-1" title={`GPU: ${specs.gpu}`}>
					<span className="max-w-[100px] truncate">{specs.gpu}</span>
				</div>
			</div>
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
			{isMac && (
				<>
					<div className="app-region-no-drag ml-2 flex gap-2 px-2">
						{buttons}
					</div>
					<div className="flex-1" />
					{specsDisplay}
				</>
			)}

			{!isMac && (
				<>
					{specsDisplay}
					<div className="flex-1" />
					<div className="app-region-no-drag ml-auto flex gap-2 px-2">
						{buttons}
					</div>
				</>
			)}
		</div>
	);
}
