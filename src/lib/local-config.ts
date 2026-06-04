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
		clearTimeout(to);
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
	const res = await fetch(`${validBaseUrl}/api/tags`);
	if (!res.ok) return [];
	const json = (await res.json().catch(() => ({}))) as OllamaTagsResponse;
	const models = Array.isArray(json?.models) ? json.models : [];
	// Map to normalized shape
	const mapped: Array<{ name: string; size: number }> = models
		.map((m) => ({
			name: String(m?.name || m?.id || ""),
			size: Number(m?.size || 0),
		}))
		.filter((m) => !!m.name);
	// Only allow the four supported Gemma 3 tags
	// TODO: add more models to the list. Technically supported, but not tested.
	const allowed = ["gemma3:4b", "gemma3:12b", "gemma3:27b"];
	const allowedSet = new Set(allowed);
	const filtered = mapped.filter((m) => allowedSet.has(m.name.toLowerCase()));
	// Dedupe by name (Ollama tags list can contain duplicates)
	const uniq = new Map<string, { name: string; size: number }>();
	for (const m of filtered) {
		const key = m.name.toLowerCase();
		if (!uniq.has(key)) uniq.set(key, m);
	}
	// Stable order for dropdown
	const order: Record<string, number> = {
		"gemma3:4b": 1,
		"gemma3:12b": 2,
		"gemma3:27b": 3,
	};
	return Array.from(uniq.values()).sort(
		(a, b) =>
			(order[a.name.toLowerCase()] ?? 99) - (order[b.name.toLowerCase()] ?? 99),
	);
}
