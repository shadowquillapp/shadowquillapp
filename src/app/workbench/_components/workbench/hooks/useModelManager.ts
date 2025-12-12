import { useEffect, useRef, useState } from "react";
import {
	listAvailableModels,
	readLocalModelConfig as readLocalModelConfigClient,
} from "@/lib/local-config";

/**
 * Hook for managing model selection and available models.
 */
export function useModelManager() {
	const [availableModels, setAvailableModels] = useState<
		Array<{ name: string; size: number }>
	>([]);
	const [currentModelId, setCurrentModelId] = useState<string | null>(null);
	const [modelMenuOpen, setModelMenuOpen] = useState(false);
	const modelBtnRef = useRef<HTMLButtonElement | null>(null);
	const modelMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const cfg = readLocalModelConfigClient();
				const models = await listAvailableModels("http://localhost:11434");
				setAvailableModels(models);
				if (cfg && cfg.provider === "ollama" && typeof cfg.model === "string") {
					setCurrentModelId(cfg.model);
				}
			} catch {
				/* ignore */
			}
		};
		load();
	}, []);

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
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") setModelMenuOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		document.addEventListener("keydown", onEsc);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
			document.removeEventListener("keydown", onEsc);
		};
	}, [modelMenuOpen]);

	return {
		availableModels,
		currentModelId,
		setCurrentModelId,
		modelMenuOpen,
		setModelMenuOpen,
		modelBtnRef,
		modelMenuRef,
	};
}
