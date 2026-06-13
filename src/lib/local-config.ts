import {
	type LocalModelConfig,
	readLocalModelConfig,
	validateOllamaBaseUrl,
} from "./domain/model-config";

export type { LocalModelConfig } from "./domain/model-config";
export {
	DEFAULT_OLLAMA_PORT,
	readLocalModelConfig,
	validateOllamaBaseUrl,
	writeLocalModelConfig,
} from "./domain/model-config";

interface OllamaTagsResponse {
	models?: Array<{ name?: string; id?: string; size?: number }>;
}

type OllamaTagsResult =
	| { ok: true; data: OllamaTagsResponse }
	| { ok: false; error: string };

export const SUPPORTED_OLLAMA_MODELS = [
	"gemma4:latest",
	"gemma4:e2b",
	"gemma4:e4b",
	"gemma4:12b",
	"gemma4:26b",
	"gemma4:31b",
	"gemma3:4b",
	"gemma3:12b",
	"gemma3:27b",
];

const SUPPORTED_OLLAMA_MODEL_SET = new Set<string>(SUPPORTED_OLLAMA_MODELS);

export function isSupportedOllamaModelName(name: string): boolean {
	return SUPPORTED_OLLAMA_MODEL_SET.has(name.trim().toLowerCase());
}

export function formatOllamaModelName(name: string): string {
	const normalized = name.trim().toLowerCase();
	const [family, tag] = normalized.split(":");
	const size = (tag || "").toUpperCase();
	if (family === "gemma4") {
		return size ? `Gemma 4 ${size}` : "Gemma 4";
	}
	if (family === "gemma3") {
		return size ? `Gemma 3 ${size}` : "Gemma 3";
	}
	return name;
}

export function isValidOllamaPort(port: string): boolean {
	return /^\d{2,5}$/.test((port || "").trim());
}

export function normalizeOllamaBaseUrlInput(value?: string): string {
	const raw = (value || "").trim();
	if (!raw) return "";
	if (/^\d{1,5}$/.test(raw)) return `http://localhost:${raw}`;
	if (/^localhost:\d{1,5}$/.test(raw)) return `http://${raw}`;
	if (/^https?:\/\//.test(raw)) return raw.replace(/\/$/, "");
	return raw;
}

async function fetchOllamaTags(baseUrl: string): Promise<OllamaTagsResult> {
	const controller = new AbortController();
	const to = setTimeout(() => controller.abort(), 15000);
	try {
		const res = await fetch(`${baseUrl}/api/tags`, {
			signal: controller.signal,
		});
		if (!res.ok) return { ok: false, error: "unreachable" };
		const data = (await res.json().catch(() => ({}))) as OllamaTagsResponse;
		return { ok: true, data };
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

export async function validateLocalModelConnection(
	cfg?: LocalModelConfig | null,
): Promise<{ ok: boolean; error?: string }> {
	const config = cfg ?? readLocalModelConfig();
	if (!config) return { ok: false, error: "not-configured" };
	if (config.provider !== "ollama")
		return { ok: false, error: "unsupported-provider" };
	const baseUrl = validateOllamaBaseUrl(config.baseUrl);
	if (!baseUrl) return { ok: false, error: "invalid-base-url" };

	const result = await fetchOllamaTags(baseUrl);
	if (!result.ok) return { ok: false, error: result.error };

	const models: Array<{ name?: string; id?: string }> = Array.isArray(
		result.data?.models,
	)
		? result.data.models
		: [];
	if (!models.length) return { ok: false, error: "no-models-found" };
	const found = models.some(
		(m) =>
			(m?.name || m?.id || "").toLowerCase() === config.model.toLowerCase(),
	);
	if (!found) return { ok: false, error: "model-not-found" };
	return { ok: true };
}

export async function listAvailableModels(
	baseUrl: string,
): Promise<Array<{ name: string; size: number }>> {
	const validBaseUrl = validateOllamaBaseUrl(baseUrl);
	if (!validBaseUrl) {
		throw new Error("invalid-base-url");
	}

	const result = await fetchOllamaTags(validBaseUrl);
	if (!result.ok) {
		throw new Error(
			result.error === "timeout" ? "Connection timed out" : "Connection failed",
		);
	}

	const models = Array.isArray(result.data?.models) ? result.data.models : [];
	const uniq = new Map<string, { name: string; size: number }>();

	for (const model of models) {
		const name = String(model?.name || model?.id || "");
		const key = name.toLowerCase();
		if (isSupportedOllamaModelName(key) && !uniq.has(key)) {
			uniq.set(key, { name, size: Number(model?.size || 0) });
		}
	}

	return Array.from(uniq.values()).sort(
		(a, b) =>
			SUPPORTED_OLLAMA_MODELS.indexOf(a.name.toLowerCase()) -
			SUPPORTED_OLLAMA_MODELS.indexOf(b.name.toLowerCase()),
	);
}
