import { describe, expect, it } from "vitest";
import {
	DEFAULT_OLLAMA_BASE_URL,
	resolveOllamaBaseUrl,
} from "@/lib/domain/model-config";

describe("resolveOllamaBaseUrl", () => {
	it("returns the configured base URL when present", () => {
		expect(
			resolveOllamaBaseUrl({
				provider: "ollama",
				baseUrl: "http://localhost:11500",
				model: "gemma3:4b",
			}),
		).toBe("http://localhost:11500");
	});

	it("falls back to the default when config is missing", () => {
		expect(resolveOllamaBaseUrl(null)).toBe(DEFAULT_OLLAMA_BASE_URL);
		expect(resolveOllamaBaseUrl(undefined)).toBe(DEFAULT_OLLAMA_BASE_URL);
	});
});
