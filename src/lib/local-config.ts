import { getJSON, setJSON } from "./local-storage";

export interface LocalModelConfig {
	provider: "ollama";
	baseUrl: string;
	model: string;
}

const PROVIDER_KEY = "MODEL_PROVIDER";
const BASE_URL_KEY = "MODEL_BASE_URL";
const MODEL_NAME_KEY = "MODEL_NAME";

export function readLocalModelConfig(): LocalModelConfig | null {
	const provider = getJSON<string | null>(PROVIDER_KEY, null);
	const baseUrl = getJSON<string | null>(BASE_URL_KEY, null);
	const model = getJSON<string | null>(MODEL_NAME_KEY, null);
	if (!provider || !baseUrl || !model) return null;
	return { provider: "ollama", baseUrl, model };
}

export function writeLocalModelConfig(cfg: LocalModelConfig): void {
	if (!cfg.provider || !cfg.baseUrl || !cfg.model) throw new Error("Invalid model configuration");
	setJSON(PROVIDER_KEY, cfg.provider);
	setJSON(BASE_URL_KEY, cfg.baseUrl);
	setJSON(MODEL_NAME_KEY, cfg.model);
}

export async function validateLocalModelConnection(
	cfg?: LocalModelConfig | null,
): Promise<{ ok: boolean; error?: string }> {
	const config = cfg ?? readLocalModelConfig();
	if (!config) return { ok: false, error: "not-configured" };
	if (config.provider !== "ollama") return { ok: false, error: "unsupported-provider" };
	const controller = new AbortController();
	const to = setTimeout(() => controller.abort(), 15000);
	try {
		const res = await fetch(config.baseUrl.replace(/\/$/, "") + "/api/tags", { signal: controller.signal });
		clearTimeout(to);
		if (!res.ok) return { ok: false, error: "unreachable" };
		const json: any = await res.json().catch(() => ({}));
		const models: Array<{ name?: string; id?: string }> = Array.isArray(json?.models) ? json.models : [];
		if (!models.length) return { ok: false, error: "no-models-found" };
		const found = models.some((m) => (m?.name || m?.id || "").toLowerCase() === config.model.toLowerCase());
		if (!found) return { ok: false, error: "model-not-found" };
		return { ok: true };
	} catch (e: any) {
		return { ok: false, error: e?.name === "AbortError" ? "timeout" : "unreachable" };
	}
}

export async function listAvailableModels(baseUrl: string): Promise<Array<{ name: string; size: number }>> {
	const res = await fetch(baseUrl.replace(/\/$/, "") + "/api/tags");
	if (!res.ok) return [];
	const json: any = await res.json().catch(() => ({}));
	const models = Array.isArray(json?.models) ? json.models : [];
	// Map to normalized shape
	const mapped: Array<{ name: string; size: number }> = models
		.map((m: any) => ({ name: String(m?.name || m?.id || ""), size: Number(m?.size || 0) }))
		.filter((m: any) => !!m.name);
	// Only allow the four supported Gemma 3 tags
	// TODO: add more models to the list. Technically supported, but not tested.
	const allowed = ["gemma3:1b", "gemma3:4b", "gemma3:12b", "gemma3:27b"];
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
		"gemma3:1b": 0,
		"gemma3:4b": 1,
		"gemma3:12b": 2,
		"gemma3:27b": 3,
	};
	return Array.from(uniq.values()).sort(
		(a, b) => (order[a.name.toLowerCase()] ?? 99) - (order[b.name.toLowerCase()] ?? 99),
	);
}


