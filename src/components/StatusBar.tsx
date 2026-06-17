"use client";

import { useEffect, useState } from "react";
import {
	formatOllamaModelName,
	readLocalModelConfig,
} from "@/lib/local-config";

type ConnectionState = "unknown" | "connected" | "offline";

const CONNECTION_LABELS: Record<ConnectionState, string> = {
	connected: "Ollama: connected",
	offline: "Ollama: offline",
	unknown: "Ollama: —",
};

export default function StatusBar() {
	const [connection, setConnection] = useState<ConnectionState>("unknown");
	const [modelId, setModelId] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	useEffect(() => {
		const syncModel = () => {
			try {
				const cfg = readLocalModelConfig();
				if (cfg && typeof cfg.model === "string") {
					setModelId(cfg.model);
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
				const id = (e as CustomEvent<{ modelId?: string }>)?.detail?.modelId;
				if (typeof id === "string") {
					setModelId(id);
				} else {
					syncModel();
				}
			} catch {}
		};
		const onConnectionStatus = (e: Event) => {
			try {
				const ok = (e as CustomEvent<{ ok?: boolean }>)?.detail?.ok;
				if (typeof ok === "boolean")
					setConnection(ok ? "connected" : "offline");
			} catch {}
		};
		const onGenerationStatus = (e: Event) => {
			try {
				const generating = (e as CustomEvent<{ generating?: boolean }>)?.detail
					?.generating;
				if (typeof generating === "boolean") setIsGenerating(generating);
			} catch {}
		};

		window.addEventListener("sq-model-changed", onModelChanged);
		window.addEventListener("MODEL_CHANGED", onModelChanged);
		window.addEventListener("storage", syncModel);
		window.addEventListener("sq-connection-status", onConnectionStatus);
		window.addEventListener("sq-generation-status", onGenerationStatus);
		return () => {
			clearInterval(pollId);
			window.removeEventListener("sq-model-changed", onModelChanged);
			window.removeEventListener("MODEL_CHANGED", onModelChanged);
			window.removeEventListener("storage", syncModel);
			window.removeEventListener("sq-connection-status", onConnectionStatus);
			window.removeEventListener("sq-generation-status", onGenerationStatus);
		};
	}, []);

	const connectionLabel = CONNECTION_LABELS[connection];

	const openOllamaSetup = () => {
		window.dispatchEvent(
			new CustomEvent("open-app-settings", { detail: { tab: "ollama" } }),
		);
	};

	return (
		<footer className="console-status-bar" role="status" aria-live="polite">
			<button
				type="button"
				className={`console-status-bar__item console-status-bar__item--action ${connection === "offline" ? "console-status-bar__item--alert" : ""}`}
				title={
					connection === "connected"
						? connectionLabel
						: "Open Ollama setup to fix the connection"
				}
				onClick={openOllamaSetup}
			>
				{connectionLabel}
			</button>
			<button
				type="button"
				className="console-status-bar__item console-status-bar__item--action"
				title={
					modelId
						? `Active model: ${modelId}`
						: "No model configured — click to set one up"
				}
				onClick={openOllamaSetup}
			>
				Model: {modelId ? formatOllamaModelName(modelId) : "not set"}
			</button>
			{isGenerating && (
				<span className="console-status-bar__item">Generating…</span>
			)}
		</footer>
	);
}
