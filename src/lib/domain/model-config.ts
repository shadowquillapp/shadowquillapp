import { getJSON, setJSON } from "../local-storage";
import { isString } from "../schema";
import { STORAGE_KEYS } from "../storage-keys";

export interface LocalModelConfig {
	provider: "ollama";
	baseUrl: string;
	model: string;
}

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export function resolveOllamaBaseUrl(
	config: LocalModelConfig | null | undefined,
): string {
	return config?.baseUrl ?? DEFAULT_OLLAMA_BASE_URL;
}

/**
 * Allow only loopback hosts. Prevents the SSRF/privilege-escalation path
 * where a non-loopback URL is written to storage and then fetched from
 * the main process IPC layer.
 */
export function isLoopbackHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

export function validateOllamaBaseUrl(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim().replace(/\/+$/, "");
	if (!trimmed) return null;
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		if (!isLoopbackHost(url.hostname)) return null;
		return `${url.protocol}//${url.host}`;
	} catch {
		return null;
	}
}

export function readLocalModelConfig(): LocalModelConfig | null {
	const provider = getJSON<string | null>(
		STORAGE_KEYS.MODEL_PROVIDER.key,
		null,
	);
	const baseUrl = getJSON<string | null>(STORAGE_KEYS.MODEL_BASE_URL.key, null);
	const model = getJSON<string | null>(STORAGE_KEYS.MODEL_NAME.key, null);
	if (!isString(provider) || !isString(baseUrl) || !isString(model)) {
		return null;
	}
	const validBaseUrl = validateOllamaBaseUrl(baseUrl);
	return validBaseUrl
		? { provider: "ollama", baseUrl: validBaseUrl, model }
		: null;
}

export function writeLocalModelConfig(cfg: LocalModelConfig): void {
	const validBaseUrl = validateOllamaBaseUrl(cfg.baseUrl);
	if (!cfg.provider || !validBaseUrl || !cfg.model) {
		throw new Error("Invalid model configuration");
	}
	setJSON(STORAGE_KEYS.MODEL_PROVIDER.key, cfg.provider);
	setJSON(STORAGE_KEYS.MODEL_BASE_URL.key, validBaseUrl);
	setJSON(STORAGE_KEYS.MODEL_NAME.key, cfg.model);
}
