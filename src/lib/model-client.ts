import type { GenerationOptions, TaskType } from "@/server/googleai";
import { readLocalModelConfig } from "./local-config";

export async function callLocalModelClient(prompt: string, opts?: { taskType?: TaskType; options?: GenerationOptions }): Promise<string> {
	const cfg = readLocalModelConfig();
	if (!cfg) throw new Error("Model not configured");
	if (cfg.provider !== "ollama") throw new Error(`Unsupported provider: ${cfg.provider}`);
	const controller = new AbortController();
	const to = setTimeout(() => controller.abort(), 90000);
	try {
		const payload: Record<string, any> = { model: cfg.model, prompt, stream: false };
		if (opts?.options && typeof opts.options.temperature === "number") {
			payload.options = { ...(payload.options ?? {}), temperature: opts.options.temperature };
		}
		const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		if (!res.ok) throw new Error(`Ollama error ${res.status}`);
		const data: any = await res.json().catch(() => ({}));
		const rawText = typeof data?.response === "string" ? data.response : JSON.stringify(data);

		// Post-process according to requested output format
		const requestedFormat = opts?.options?.format ?? "plain";

		// Helper: unwrap a single outer fenced block and return its inner content
		const unwrapOuterFence = (text: string): { inner: string; stripped: boolean; lang: string } => {
			const fenceMatch = text.match(/^\s*```([^\n]*)\n?([\s\S]*?)\n```[\s\r]*$/);
			if (!fenceMatch) return { inner: text, stripped: false, lang: "" };
			const lang = (fenceMatch[1] || "").trim().toLowerCase();
			return { inner: fenceMatch[2] || "", stripped: true, lang };
		};

		if (requestedFormat === "markdown") {
			const { inner } = unwrapOuterFence(rawText);
			const content = inner.trim();
			return `\`\`\`markdown\n${content}\n\`\`\``;
		}

		if (requestedFormat === "json") {
			// Try to unwrap if it already came fenced
			let candidate = rawText.trim();
			const unwrapped = unwrapOuterFence(candidate);
			if (unwrapped.stripped) candidate = unwrapped.inner.trim();
			// Try to pretty-print valid JSON; otherwise keep as-is
			try {
				const parsed = JSON.parse(candidate);
				candidate = JSON.stringify(parsed, null, 2);
			} catch {
				// leave candidate as-is if not valid JSON
			}
			return `\`\`\`json\n${candidate}\n\`\`\``;
		}

		// Plain text: return raw
		return rawText;
	} finally {
		clearTimeout(to);
	}
}


