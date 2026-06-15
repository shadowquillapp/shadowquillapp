"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readLocalModelConfig } from "@/lib/domain/model-config";
import { validateLocalModelConnection } from "@/lib/local-config";
import { useDialog } from "./DialogProvider";
import { useOpenOrInstallOllama } from "./useOpenOrInstallOllama";

export default function OllamaConnectionMonitor() {
	const { confirm } = useDialog();
	const [isMonitoring, setIsMonitoring] = useState(false);
	const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);
	const lastKnownStatusRef = useRef<boolean | null>(null);

	const checkOllamaInstalled = useCallback(async (): Promise<
		boolean | null
	> => {
		try {
			if (!window.shadowquill?.checkOllamaInstalled) {
				setOllamaInstalled(null);
				return null;
			}
			const result = await window.shadowquill.checkOllamaInstalled();
			setOllamaInstalled(result.installed);
			return result.installed;
		} catch (e) {
			console.error("Failed to check Ollama installation:", e);
			setOllamaInstalled(null);
			return null;
		}
	}, []);

	const broadcastStatus = useCallback((ok: boolean) => {
		try {
			window.dispatchEvent(
				new CustomEvent("sq-connection-status", { detail: { ok } }),
			);
		} catch (e) {
			console.debug("[OllamaConnectionMonitor] status broadcast failed:", e);
		}
	}, []);

	const testLocalConnection = useCallback(async () => {
		const config = readLocalModelConfig();
		if (!config) return;
		const result = await validateLocalModelConnection(config);
		lastKnownStatusRef.current = result.ok;
		broadcastStatus(result.ok);
	}, [broadcastStatus]);

	const { handleOpenOrInstallOllama } = useOpenOrInstallOllama({
		ollamaInstalled,
		checkOllamaInstalled,
		testLocalConnection,
	});

	const checkConnection = useCallback(async () => {
		const config = readLocalModelConfig();
		if (!config) {
			setIsMonitoring(false);
			broadcastStatus(false);
			return;
		}

		setIsMonitoring(true);
		const result = await validateLocalModelConnection(config);
		broadcastStatus(result.ok);

		if (lastKnownStatusRef.current === true && !result.ok) {
			let isInstalled = ollamaInstalled;
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
				await handleOpenOrInstallOllama();
				await testLocalConnection();
				return;
			}
		}
		lastKnownStatusRef.current = result.ok;
	}, [
		broadcastStatus,
		checkOllamaInstalled,
		confirm,
		handleOpenOrInstallOllama,
		ollamaInstalled,
		testLocalConnection,
	]);

	useEffect(() => {
		const initialTimeout = setTimeout(() => {
			void checkConnection();
		}, 0);

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
		const onModelChanged = () => {
			void checkConnection();
		};

		window.addEventListener("MODEL_CHANGED", onModelChanged);
		return () => window.removeEventListener("MODEL_CHANGED", onModelChanged);
	}, [checkConnection]);

	return null;
}
