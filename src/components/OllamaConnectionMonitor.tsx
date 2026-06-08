"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	readLocalModelConfig,
	validateLocalModelConnection,
} from "@/lib/local-config";
import { useDialog } from "./DialogProvider";

export default function OllamaConnectionMonitor() {
	const { confirm } = useDialog();
	const [isMonitoring, setIsMonitoring] = useState(false);
	const lastKnownStatusRef = useRef<boolean | null>(null);
	const ollamaInstalledRef = useRef<boolean | null>(null);

	const checkOllamaInstalled = useCallback(async (): Promise<
		boolean | null
	> => {
		try {
			if (!window.shadowquill?.checkOllamaInstalled) {
				return null;
			}
			const result = await window.shadowquill.checkOllamaInstalled();
			ollamaInstalledRef.current = result.installed;
			return result.installed;
		} catch (e) {
			console.error("Failed to check Ollama installation:", e);
			return null;
		}
	}, []);

	const handleOpenOrInstallOllama = useCallback(
		async (isInstalled: boolean | null) => {
			try {
				if (isInstalled === false) {
					window.open("https://ollama.com/download", "_blank");
					return;
				}

				if (!window.shadowquill?.openOllama) {
					return;
				}

				const result = await window.shadowquill.openOllama();

				if (result.ok) {
					return new Promise<void>((resolve) => {
						setTimeout(resolve, 3000);
					});
				}
			} catch (e: unknown) {
				console.error("Failed to open Ollama:", e);
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
	}, [checkConnection]);

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
