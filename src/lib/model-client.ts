import type { GenerationOptions, TaskType } from "@/types";
import { ModelError, NetworkError } from "./errors";
import { readLocalModelConfig } from "./local-config";

export async function callLocalModelClient(
	prompt: string,
	opts?: { taskType?: TaskType; options?: GenerationOptions },
): Promise<string> {
	// Remove any meta "Word Count" lines that some models add to their output
	const stripMetaWordCount = (text: string): string => {
		if (!text) return text;
		const patterns: RegExp[] = [
			/^\s*(?:\*\*|__)?\s*word\s*count\s*(?:\*\*|__)?\s*:\s*\d+(?:\s+words?)?\s*$/i,
			/^\s*word\s*count\s*:\s*~?\s*\d+(?:\s+words?)?\s*$/i,
			/^\s*total\s*words\s*:\s*\d+\s*$/i,
			/^\s*length\s*:\s*\d+\s+words\s*$/i,
		];
		return text
			.split(/\r?\n/)
			.filter((line) => !patterns.some((re) => re.test(line)))
			.join("\n");
	};

	const cfg = readLocalModelConfig();
	if (!cfg) {
		throw new ModelError("Model not configured", {
			details: { reason: "no_config" },
		});
	}
	if (cfg.provider !== "ollama") {
		throw new ModelError(`Unsupported provider: ${cfg.provider}`, {
			details: { provider: cfg.provider },
		});
	}
	const controller = new AbortController();
	const to = setTimeout(() => controller.abort(), 90000);
	try {
		const payload: Record<string, any> = {
			model: cfg.model,
			prompt,
			stream: false,
		};
		if (opts?.options && typeof opts.options.temperature === "number") {
			payload.options = {
				...(payload.options ?? {}),
				temperature: opts.options.temperature,
			};
		}
		const endpoint = `${cfg.baseUrl.replace(/\/$/, "")}/api/generate`;
		let res: Response;
		try {
			res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
				signal: controller.signal,
			});
		} catch (fetchError) {
			if (fetchError instanceof Error && fetchError.name === "AbortError") {
				throw new ModelError("Request timed out", {
					modelId: cfg.model,
					isTimeout: true,
					cause: fetchError,
				});
			}
		throw new NetworkError("Failed to connect to Ollama", {
			endpoint,
			...(fetchError instanceof Error && { cause: fetchError }),
		});
		}
		if (!res.ok) {
			throw new ModelError(`Ollama error ${res.status}`, {
				modelId: cfg.model,
				statusCode: res.status,
			});
		}
		const data: any = await res.json().catch(() => ({}));
		const rawText =
			typeof data?.response === "string" ? data.response : JSON.stringify(data);

		// Post-process according to requested output format
		const requestedFormat = opts?.options?.format ?? "plain";

		// Helper: unwrap a single outer fenced block and return its inner content
		const unwrapOuterFence = (
			text: string,
		): { inner: string; stripped: boolean; lang: string } => {
			const fenceMatch = text.match(
				/^\s*```([^\n]*)\n?([\s\S]*?)\n```[\s\r]*$/,
			);
			if (!fenceMatch) return { inner: text, stripped: false, lang: "" };
			const lang = (fenceMatch[1] || "").trim().toLowerCase();
			return { inner: fenceMatch[2] || "", stripped: true, lang };
		};

		if (requestedFormat === "markdown") {
			const { inner } = unwrapOuterFence(rawText);
			const content = stripMetaWordCount(inner).trim();
			return `\`\`\`markdown\n${content}\n\`\`\``;
		}

		if (requestedFormat === "xml") {
			// Try to unwrap if it already came fenced
			let candidate = rawText.trim();
			const unwrapped = unwrapOuterFence(candidate);
			if (unwrapped.stripped) candidate = unwrapped.inner.trim();
			// No XML pretty-print; just wrap
			candidate = stripMetaWordCount(candidate);
			return `\`\`\`xml\n${candidate}\n\`\`\``;
		}

		// Plain text: return raw
		return stripMetaWordCount(rawText);
	} finally {
		clearTimeout(to);
	}
}
