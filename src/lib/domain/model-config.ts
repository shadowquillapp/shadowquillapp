import { getJSON, remove, setJSON } from "../local-storage";
import { isRecord, isString } from "../schema";
import { STORAGE_KEYS } from "../storage-keys";

export interface LocalModelConfig {
	provider: "ollama";
	baseUrl: string;
	model: string;
}

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

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

function isLocalModelConfig(v: unknown): v is LocalModelConfig {
	return (
		isRecord(v) &&
		v.provider === "ollama" &&
		typeof v.baseUrl === "string" &&
		typeof v.model === "string" &&
		validateOllamaBaseUrl(v.baseUrl) !== null
	);
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
	const candidate = { provider: "ollama" as const, baseUrl, model };
	return isLocalModelConfig(candidate) ? candidate : null;
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

export function clearLocalModelConfig(): void {
	remove(STORAGE_KEYS.MODEL_PROVIDER.key);
	remove(STORAGE_KEYS.MODEL_BASE_URL.key);
	remove(STORAGE_KEYS.MODEL_NAME.key);
}
