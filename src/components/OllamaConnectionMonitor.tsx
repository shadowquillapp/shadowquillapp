"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	readLocalModelConfig,
	validateLocalModelConnection,
} from "@/lib/local-config";
import { useDialog } from "./DialogProvider";

interface WindowWithShadowQuill extends Window {
	shadowquill?: {
		checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
		openOllama?: () => Promise<{ ok: boolean; error?: string }>;
	};
}

export default function OllamaConnectionMonitor() {
	const { confirm } = useDialog();
	const [isMonitoring, setIsMonitoring] = useState(false);
	const lastKnownStatusRef = useRef<boolean | null>(null);
	const [_isOpeningOllama, setIsOpeningOllama] = useState(false);
	const ollamaInstalledRef = useRef<boolean | null>(null);

	const checkOllamaInstalled = useCallback(async (): Promise<
		boolean | null
	> => {
		try {
			const win = window as WindowWithShadowQuill;
			if (!win.shadowquill?.checkOllamaInstalled) {
				return null;
			}
			const result = await win.shadowquill.checkOllamaInstalled();
			ollamaInstalledRef.current = result.installed;
			return result.installed;
		} catch (e) {
			console.error("Failed to check Ollama installation:", e);
			return null;
		}
	}, []);

	const handleOpenOrInstallOllama = useCallback(
		async (isInstalled: boolean | null) => {
			setIsOpeningOllama(true);

			try {
				const win = window as WindowWithShadowQuill;

				if (isInstalled === false) {
					window.open("https://ollama.com/download", "_blank");
					setIsOpeningOllama(false);
					return;
				}

				if (!win.shadowquill?.openOllama) {
					setIsOpeningOllama(false);
					return;
				}

				const result = await win.shadowquill.openOllama();

				if (result.ok) {
					return new Promise<void>((resolve) => {
						setTimeout(resolve, 3000);
					});
				}
			} catch (e: unknown) {
				console.error("Failed to open Ollama:", e);
			} finally {
				setIsOpeningOllama(false);
			}
		},
		[],
	);

	const checkConnection = useCallback(async () => {
		const config = readLocalModelConfig();
		if (!config) {
			setIsMonitoring(false);
			return;
		}

		setIsMonitoring(true);
		const result = await validateLocalModelConnection(config);

		if (lastKnownStatusRef.current === true && !result.ok) {
			let isInstalled = ollamaInstalledRef.current;
			if (isInstalled === null) {
				isInstalled = await checkOllamaInstalled();
			}

			const buttonText =
				isInstalled === false ? "Install Ollama" : "Open Ollama";
			const shouldOpen = await confirm({
				title: "AI Model Connection Lost",
				message:
					"Ollama has stopped or become unreachable. ShadowQuill needs Ollama to be running to generate AI responses.",
				confirmText: buttonText,
				cancelText: "Dismiss",
				tone: "primary",
			});

			if (shouldOpen) {
				await handleOpenOrInstallOllama(isInstalled);
				const recheckConfig = readLocalModelConfig();
				if (recheckConfig) {
					const recheckResult =
						await validateLocalModelConnection(recheckConfig);
					lastKnownStatusRef.current = recheckResult.ok;
				}
				return;
			}
		}
		lastKnownStatusRef.current = result.ok;
	}, [confirm, checkOllamaInstalled, handleOpenOrInstallOllama]);

	useEffect(() => {
		const initialTimeout = setTimeout(() => {
			void checkConnection();
		}, 3000);

		return () => clearTimeout(initialTimeout);
	}, []);

	// Periodic monitoring every 10 seconds
	useEffect(() => {
		if (!isMonitoring) return;
		const interval = setInterval(() => {
			void checkConnection();
		}, 10000);
		
		return () => clearInterval(interval);
	}, [isMonitoring, checkConnection]);

	useEffect(() => {
		const handler = () => {
			void checkConnection();
		};

		window.addEventListener("MODEL_CHANGED", handler);
		return () => window.removeEventListener("MODEL_CHANGED", handler);
	}, [checkConnection]);

	return null;
}
