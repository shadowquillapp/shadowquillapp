"use client";

import { useEffect, useState, useCallback } from "react";
import { validateLocalModelConnection, readLocalModelConfig } from "@/lib/local-config";
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
	const [lastKnownStatus, setLastKnownStatus] = useState<boolean | null>(null);
	const [isOpeningOllama, setIsOpeningOllama] = useState(false);
	const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);

	const checkOllamaInstalled = useCallback(async () => {
		try {
			const win = window as WindowWithShadowQuill;
			if (!win.shadowquill?.checkOllamaInstalled) {
				return;
			}
			const result = await win.shadowquill.checkOllamaInstalled();
			setOllamaInstalled(result.installed);
		} catch (e) {
			console.error("Failed to check Ollama installation:", e);
		}
	}, []);

	const checkConnection = useCallback(async () => {
		const config = readLocalModelConfig();
		if (!config) {
			// No config yet, nothing to monitor
			setIsMonitoring(false);
			return;
		}

		setIsMonitoring(true);
		const result = await validateLocalModelConnection(config);
		
		// If we had a connection and now we don't, alert the user
		if (lastKnownStatus === true && !result.ok) {
			// Check if Ollama is installed
			if (ollamaInstalled === null) {
				await checkOllamaInstalled();
			}

			const buttonText = ollamaInstalled === false ? "Install Ollama" : "Open Ollama";
			const shouldOpen = await confirm({
				title: "Ollama Connection Lost",
				message: "Ollama has stopped or become unreachable. ShadowQuill needs Ollama to be running to generate AI responses.",
				confirmText: buttonText,
				cancelText: "Dismiss",
				tone: "primary"
			});

			if (shouldOpen) {
				await handleOpenOrInstallOllama();
			}
		}

		setLastKnownStatus(result.ok);
	}, [lastKnownStatus, ollamaInstalled, confirm, checkOllamaInstalled]);

	const handleOpenOrInstallOllama = async () => {
		setIsOpeningOllama(true);

		try {
			const win = window as WindowWithShadowQuill;
			
			// Check if installed first
			if (ollamaInstalled === null) {
				await checkOllamaInstalled();
			}

			if (ollamaInstalled === false) {
				// Open download page
				window.open("https://ollama.com/download", "_blank");
				setIsOpeningOllama(false);
				return;
			}

			if (!win.shadowquill?.openOllama) {
				return;
			}

			const result = await win.shadowquill.openOllama();

			if (result.ok) {
				// Wait 3 seconds then recheck
				setTimeout(() => {
					void checkConnection();
				}, 3000);
			}
		} catch (e: unknown) {
			console.error("Failed to open Ollama:", e);
		} finally {
			setIsOpeningOllama(false);
		}
	};

	// Initial check after a short delay
	useEffect(() => {
		const initialTimeout = setTimeout(() => {
			void checkConnection();
		}, 3000);

		return () => clearTimeout(initialTimeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Periodic monitoring every 10 seconds
	useEffect(() => {
		if (!isMonitoring) return;

		const interval = setInterval(() => {
			void checkConnection();
		}, 10000);

		return () => clearInterval(interval);
	}, [isMonitoring, checkConnection]);

	// Listen for MODEL_CHANGED events to recheck connection
	useEffect(() => {
		const handler = () => {
			void checkConnection();
		};

		window.addEventListener("MODEL_CHANGED", handler);
		return () => window.removeEventListener("MODEL_CHANGED", handler);
	}, [checkConnection]);

	return null; // This component doesn't render anything
}

