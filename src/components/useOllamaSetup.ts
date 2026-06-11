"use client";

import { useCallback, useState } from "react";
import {
	isSupportedOllamaModelName,
	isValidOllamaPort,
	listAvailableModels,
	normalizeOllamaBaseUrlInput,
	readLocalModelConfig,
	validateLocalModelConnection,
	writeLocalModelConfig,
} from "@/lib/local-config";
import { useOpenOrInstallOllama } from "./useOpenOrInstallOllama";

export type OllamaTestResult = {
	success: boolean;
	url: string;
	models?: Array<{ name: string; size: number }>;
	error?: string;
	duration?: number;
};

export type OllamaSaveResult =
	| {
			ok: true;
			payload: { provider: "ollama"; baseUrl: string; model: string };
	  }
	| { ok: false; error?: string };

export function useOllamaSetup() {
	const [localPort, setLocalPort] = useState("11434");
	const [model, setModel] = useState("");
	const [saving, setSaving] = useState(false);
	const [validating, setValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [testingLocal, setTestingLocal] = useState(false);
	const [localTestResult, setLocalTestResult] =
		useState<OllamaTestResult | null>(null);
	const [availableModels, setAvailableModels] = useState<string[]>([]);
	const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);

	const testLocalConnection = useCallback(
		async (baseUrlParam?: string, configuredModel?: string) => {
			const url = normalizeOllamaBaseUrlInput(baseUrlParam ?? localPort);
			if (!url) return;
			setTestingLocal(true);
			setLocalTestResult(null);
			const start = Date.now();
			try {
				const models = await listAvailableModels(url);
				const duration = Date.now() - start;
				const gemmaModels = models.filter(
					(m) => m?.name && isSupportedOllamaModelName(m.name),
				);
				const gemmaModelNames = gemmaModels.map((m) => m.name);
				setLocalTestResult({
					success: true,
					url,
					models: gemmaModels,
					duration,
				});
				setAvailableModels(gemmaModelNames);
				setConnectionError(null);
				if (configuredModel && gemmaModelNames.includes(configuredModel)) {
					setModel(configuredModel);
				} else if (gemmaModelNames.length > 0) {
					setModel(gemmaModelNames[0] ?? "");
				} else {
					setModel("");
				}
			} catch {
				const duration = Date.now() - start;
				setLocalTestResult({
					success: false,
					url,
					error: "Connection failed",
					duration,
				});
				setAvailableModels([]);
			} finally {
				setTestingLocal(false);
			}
		},
		[localPort],
	);

	const checkOllamaInstalled = useCallback(async () => {
		try {
			if (!window.shadowquill?.checkOllamaInstalled) return;
			const result = await window.shadowquill.checkOllamaInstalled();
			setOllamaInstalled(result.installed);
		} catch (e) {
			console.error("Failed to check Ollama installation:", e);
		}
	}, []);

	const { handleOpenOrInstallOllama, isOpeningOllama, openOllamaError } =
		useOpenOrInstallOllama({
			ollamaInstalled,
			checkOllamaInstalled,
			testLocalConnection,
		});

	const loadFromStorage = useCallback(async () => {
		try {
			await checkOllamaInstalled();
			const cfg = readLocalModelConfig();
			if (cfg?.provider !== "ollama") return null;
			const base = String(cfg.baseUrl || "http://localhost:11434");
			const portMatch = base.match(/:(\d{1,5})/);
			setLocalPort(portMatch?.[1] ?? "11434");
			await testLocalConnection(cfg.baseUrl, cfg.model);
			return cfg;
		} catch (err) {
			console.error("Failed to load Ollama configuration:", err);
			return null;
		}
	}, [checkOllamaInstalled, testLocalConnection]);

	const saveConfiguration = useCallback(async (): Promise<OllamaSaveResult> => {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				provider: "ollama" as const,
				baseUrl: normalizeOllamaBaseUrlInput(localPort),
				model,
			};
			writeLocalModelConfig(payload);
			setValidating(true);
			try {
				const vjson = await validateLocalModelConnection(payload);
				if (vjson.ok) {
					setConnectionError(null);
					try {
						window.dispatchEvent(
							new CustomEvent("sq-model-changed", {
								detail: { modelId: payload.model },
							}),
						);
						window.dispatchEvent(new Event("MODEL_CHANGED"));
					} catch {}
					return { ok: true, payload };
				}
				const errorMsg = vjson.error || "Connection failed";
				if (errorMsg === "model-not-found") {
					setConnectionError(
						`Model "${model}" not found in Ollama. Run: ollama pull ${model}`,
					);
				} else {
					setConnectionError(errorMsg);
				}
				return { ok: false, error: errorMsg };
			} finally {
				setValidating(false);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setError(message);
			return { ok: false, error: message };
		} finally {
			setSaving(false);
		}
	}, [localPort, model]);

	const normalizedBaseUrl = normalizeOllamaBaseUrlInput(localPort);
	const portInvalid = Boolean(localPort) && !isValidOllamaPort(localPort);
	const statusTone: "success" | "error" | "loading" | "idle" = testingLocal
		? "loading"
		: localTestResult
			? localTestResult.success
				? "success"
				: "error"
			: connectionError
				? "error"
				: "idle";

	return {
		localPort,
		setLocalPort,
		model,
		saving,
		validating,
		setValidating,
		error,
		connectionError,
		setConnectionError,
		testingLocal,
		localTestResult,
		setLocalTestResult,
		availableModels,
		ollamaInstalled,
		testLocalConnection,
		checkOllamaInstalled,
		loadFromStorage,
		saveConfiguration,
		handleOpenOrInstallOllama,
		isOpeningOllama,
		openOllamaError,
		statusTone,
		portInvalid,
		normalizedBaseUrl,
		canSave: !saving && !validating && model.trim() !== "",
		hasModels: availableModels.length > 0,
	};
}

export type OllamaSetupState = ReturnType<typeof useOllamaSetup>;
