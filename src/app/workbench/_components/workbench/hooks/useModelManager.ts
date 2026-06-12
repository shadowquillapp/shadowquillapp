import { useCallback, useEffect, useRef, useState } from "react";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";
import { resolveOllamaBaseUrl } from "@/lib/domain/model-config";
import {
	listAvailableModels,
	readLocalModelConfig as readLocalModelConfigClient,
} from "@/lib/local-config";

export function useModelManager() {
	const [availableModels, setAvailableModels] = useState<
		Array<{ name: string; size: number }>
	>([]);
	const [currentModelId, setCurrentModelId] = useState<string | null>(null);
	const [modelLoadError, setModelLoadError] = useState<string | null>(null);
	const [modelMenuOpen, setModelMenuOpen] = useState(false);
	const modelBtnRef = useRef<HTMLButtonElement | null>(null);
	const modelMenuRef = useRef<HTMLDivElement | null>(null);
	useCloseOnEscape(modelMenuOpen, () => setModelMenuOpen(false));

	const refreshModels = useCallback(async () => {
		try {
			setModelLoadError(null);
			const cfg = readLocalModelConfigClient();
			const models = await listAvailableModels(resolveOllamaBaseUrl(cfg));
			setAvailableModels(models);
			if (cfg && cfg.provider === "ollama" && typeof cfg.model === "string") {
				setCurrentModelId(cfg.model);
			}
		} catch (error) {
			setAvailableModels([]);
			setModelLoadError(
				error instanceof Error ? error.message : "Unable to load Ollama models",
			);
		}
	}, []);

	useEffect(() => {
		void refreshModels();
	}, [refreshModels]);

	useEffect(() => {
		const onModelChanged = () => {
			void refreshModels();
		};
		window.addEventListener("MODEL_CHANGED", onModelChanged);
		window.addEventListener("sq-model-changed", onModelChanged);
		return () => {
			window.removeEventListener("MODEL_CHANGED", onModelChanged);
			window.removeEventListener("sq-model-changed", onModelChanged);
		};
	}, [refreshModels]);

	useEffect(() => {
		if (!modelMenuOpen) return;
		const btn = modelBtnRef.current;
		const menu = modelMenuRef.current;
		if (!btn) return;

		const onClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (!btn.contains(target) && !menu?.contains(target)) {
				setModelMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
		};
	}, [modelMenuOpen]);

	return {
		availableModels,
		modelLoadError,
		refreshModels,
		currentModelId,
		setCurrentModelId,
		modelMenuOpen,
		setModelMenuOpen,
		modelBtnRef,
		modelMenuRef,
	};
}
