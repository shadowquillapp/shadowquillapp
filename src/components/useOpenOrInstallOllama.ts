"use client";

import { useCallback, useState } from "react";

interface WindowWithOllamaApi extends Window {
	shadowquill?: {
		openOllama?: () => Promise<{ ok: boolean; error?: string }>;
	};
}

interface UseOpenOrInstallOllamaOptions {
	ollamaInstalled: boolean | null;
	checkOllamaInstalled: () => Promise<void>;
	testLocalConnection: () => void | Promise<void>;
}

export function useOpenOrInstallOllama({
	ollamaInstalled,
	checkOllamaInstalled,
	testLocalConnection,
}: UseOpenOrInstallOllamaOptions) {
	const [isOpeningOllama, setIsOpeningOllama] = useState(false);
	const [openOllamaError, setOpenOllamaError] = useState<string | null>(null);

	const handleOpenOrInstallOllama = useCallback(async () => {
		setIsOpeningOllama(true);
		setOpenOllamaError(null);

		try {
			const win = window as WindowWithOllamaApi;

			if (ollamaInstalled === null) {
				await checkOllamaInstalled();
			}

			if (ollamaInstalled === false) {
				window.open("https://ollama.com/download", "_blank");
				return;
			}

			if (!win.shadowquill?.openOllama) {
				setOpenOllamaError(
					"This feature is only available in the desktop app.",
				);
				return;
			}

			const result = await win.shadowquill.openOllama();

			if (result.ok) {
				setTimeout(() => {
					setOpenOllamaError(null);
					void testLocalConnection();
				}, 3000);
			} else {
				setOpenOllamaError(result.error || "Failed to open Ollama");
			}
		} catch (e: unknown) {
			setOpenOllamaError(
				e instanceof Error ? e.message : "Failed to open Ollama",
			);
		} finally {
			setIsOpeningOllama(false);
		}
	}, [checkOllamaInstalled, ollamaInstalled, testLocalConnection]);

	return {
		handleOpenOrInstallOllama,
		isOpeningOllama,
		openOllamaError,
	};
}
