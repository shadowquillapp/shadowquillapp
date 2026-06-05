import {
	type LocalModelConfig,
	readLocalModelConfig,
	validateOllamaBaseUrl,
	writeLocalModelConfig,
} from "./domain/model-config";

export type { LocalModelConfig } from "./domain/model-config";
export { readLocalModelConfig, validateOllamaBaseUrl, writeLocalModelConfig };

interface OllamaTagsResponse {
	models?: Array<{ name?: string; id?: string; size?: number }>;
}

const SUPPORTED_OLLAMA_MODELS = ["gemma3:4b", "gemma3:12b", "gemma3:27b"];

export async function validateLocalModelConnection(
	cfg?: LocalModelConfig | null,
): Promise<{ ok: boolean; error?: string }> {
	const config = cfg ?? readLocalModelConfig();
	if (!config) return { ok: false, error: "not-configured" };
	if (config.provider !== "ollama")
		return { ok: false, error: "unsupported-provider" };
	const baseUrl = validateOllamaBaseUrl(config.baseUrl);
	if (!baseUrl) return { ok: false, error: "invalid-base-url" };
	const controller = new AbortController();
	const to = setTimeout(() => controller.abort(), 15000);
	try {
		const res = await fetch(`${baseUrl}/api/tags`, {
			signal: controller.signal,
		});
		if (!res.ok) return { ok: false, error: "unreachable" };
		const json = (await res.json().catch(() => ({}))) as OllamaTagsResponse;
		const models: Array<{ name?: string; id?: string }> = Array.isArray(
			json?.models,
		)
			? json.models
			: [];
		if (!models.length) return { ok: false, error: "no-models-found" };
		const found = models.some(
			(m) =>
				(m?.name || m?.id || "").toLowerCase() === config.model.toLowerCase(),
		);
		if (!found) return { ok: false, error: "model-not-found" };
		return { ok: true };
	} catch (e: unknown) {
		const err = e as { name?: string };
		return {
			ok: false,
			error: err?.name === "AbortError" ? "timeout" : "unreachable",
		};
	} finally {
		clearTimeout(to);
	}
}

export async function listAvailableModels(
	baseUrl: string,
): Promise<Array<{ name: string; size: number }>> {
	const validBaseUrl = validateOllamaBaseUrl(baseUrl);
	if (!validBaseUrl) return [];

	const controller = new AbortController();
	const to = setTimeout(() => controller.abort(), 15000);

	try {
		const res = await fetch(`${validBaseUrl}/api/tags`, {
			signal: controller.signal,
		});
		if (!res.ok) return [];
		const json = (await res.json().catch(() => ({}))) as OllamaTagsResponse;
		const models = Array.isArray(json?.models) ? json.models : [];
		const allowedSet = new Set(SUPPORTED_OLLAMA_MODELS);
		const uniq = new Map<string, { name: string; size: number }>();

		for (const model of models) {
			const name = String(model?.name || model?.id || "");
			const key = name.toLowerCase();
			if (allowedSet.has(key) && !uniq.has(key)) {
				uniq.set(key, { name, size: Number(model?.size || 0) });
			}
		}

		return Array.from(uniq.values()).sort(
			(a, b) =>
				SUPPORTED_OLLAMA_MODELS.indexOf(a.name.toLowerCase()) -
				SUPPORTED_OLLAMA_MODELS.indexOf(b.name.toLowerCase()),
		);
	} catch {
		return [];
	} finally {
		clearTimeout(to);
	}
}
