import { ModelError, NetworkError } from "@/lib/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the local-config module
vi.mock("@/lib/local-config", () => ({
	readLocalModelConfig: vi.fn(),
}));

import { readLocalModelConfig } from "@/lib/local-config";
// Import after mocking
import { callLocalModelClient } from "@/lib/model-client";

const mockReadLocalModelConfig = vi.mocked(readLocalModelConfig);

describe("callLocalModelClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("configuration validation", () => {
		it("should throw ModelError when no config exists", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);

			await expect(callLocalModelClient("test prompt")).rejects.toThrow(
				ModelError,
			);
			await expect(callLocalModelClient("test prompt")).rejects.toThrow(
				"Model not configured",
			);
		});

		it("should throw ModelError for unsupported provider", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				// @ts-expect-error Testing unsupported provider
				provider: "openai",
				baseUrl: "http://localhost",
				model: "test-model",
			});

			await expect(callLocalModelClient("test prompt")).rejects.toThrow(
				ModelError,
			);
			await expect(callLocalModelClient("test prompt")).rejects.toThrow(
				"Unsupported provider",
			);
		});
	});

	describe("successful API calls", () => {
		beforeEach(() => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
		});

		it("should call Ollama API with correct payload", async () => {
			const mockResponse = { response: "Generated text response" };
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await callLocalModelClient("test prompt");

			expect(global.fetch).toHaveBeenCalledWith(
				"http://localhost:11434/api/generate",
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: expect.stringContaining('"prompt":"test prompt"'),
				}),
			);
			expect(result).toBe("Generated text response");
		});

		it("should include temperature in request when provided", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ response: "response" }),
			});
			global.fetch = mockFetch;

			await callLocalModelClient("prompt", {
				taskType: "general",
				options: { temperature: 0.7 },
			});

			const callArgs = mockFetch.mock.calls[0];
			const body = JSON.parse(callArgs?.[1].body as string);
			expect(body.options.temperature).toBe(0.7);
		});

		it("should handle trailing slash in baseUrl", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434/",
				model: "gemma3:4b",
			});

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ response: "text" }),
			});

			await callLocalModelClient("prompt");

			expect(global.fetch).toHaveBeenCalledWith(
				"http://localhost:11434/api/generate",
				expect.anything(),
			);
		});
	});

	describe("error handling", () => {
		beforeEach(() => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
		});

		it("should throw NetworkError when fetch fails", async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

			await expect(callLocalModelClient("prompt")).rejects.toThrow(
				NetworkError,
			);
			await expect(callLocalModelClient("prompt")).rejects.toThrow(
				"Failed to connect to Ollama",
			);
		});

		it("should throw ModelError with timeout flag on abort", async () => {
			const abortError = new Error("Aborted");
			abortError.name = "AbortError";
			global.fetch = vi.fn().mockRejectedValue(abortError);

			try {
				await callLocalModelClient("prompt");
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(ModelError);
				expect((error as ModelError).isTimeout).toBe(true);
				expect((error as ModelError).message).toBe("Request timed out");
			}
		});

		it("should throw ModelError for non-ok response", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			try {
				await callLocalModelClient("prompt");
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(ModelError);
				expect((error as ModelError).message).toContain("500");
			}
		});

		it("should handle JSON parse failure gracefully", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.reject(new Error("Invalid JSON")),
			});

			const result = await callLocalModelClient("prompt");
			// Should return stringified empty object when json parsing fails
			expect(result).toBe("{}");
		});
	});

	describe("output format processing", () => {
		beforeEach(() => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
		});

		it("should wrap markdown responses in code fence", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ response: "# Heading\n\nSome content" }),
			});

			const result = await callLocalModelClient("prompt", {
				options: { format: "markdown" },
			});

			expect(result).toMatch(/^```markdown\n/);
			expect(result).toMatch(/\n```$/);
			expect(result).toContain("# Heading");
		});

		it("should unwrap outer fence for markdown responses", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({ response: "```markdown\n# Content\n```" }),
			});

			const result = await callLocalModelClient("prompt", {
				options: { format: "markdown" },
			});

			// Should not double-wrap
			expect(result).toBe("```markdown\n# Content\n```");
		});

		it("should wrap XML responses in code fence", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({ response: "<root><item>value</item></root>" }),
			});

			const result = await callLocalModelClient("prompt", {
				options: { format: "xml" },
			});

			expect(result).toMatch(/^```xml\n/);
			expect(result).toMatch(/\n```$/);
			expect(result).toContain("<root>");
		});

		it("should unwrap outer fence for XML responses", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						response: "```xml\n<root><item>value</item></root>\n```",
					}),
			});

			const result = await callLocalModelClient("prompt", {
				options: { format: "xml" },
			});

			// Should unwrap and re-wrap
			expect(result).toBe("```xml\n<root><item>value</item></root>\n```");
		});

		it("should return plain text without wrapping", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ response: "Plain text response" }),
			});

			const result = await callLocalModelClient("prompt", {
				options: { format: "plain" },
			});

			expect(result).toBe("Plain text response");
			expect(result).not.toContain("```");
		});

		it("should default to plain text format", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ response: "Response text" }),
			});

			const result = await callLocalModelClient("prompt");

			expect(result).toBe("Response text");
		});
	});

	describe("meta word count stripping", () => {
		beforeEach(() => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
		});

		it("should handle empty response text", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ response: "" }),
			});

			const result = await callLocalModelClient("prompt");

			expect(result).toBe("");
		});

		it("should strip word count lines from output", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						response: "Main content here\nWord Count: 500\nMore content",
					}),
			});

			const result = await callLocalModelClient("prompt");

			expect(result).not.toContain("Word Count:");
			expect(result).toContain("Main content here");
			expect(result).toContain("More content");
		});

		it("should strip bold word count variations", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						response: "Content\n**Word Count**: 250 words",
					}),
			});

			const result = await callLocalModelClient("prompt");

			expect(result).not.toContain("Word Count");
			expect(result).toContain("Content");
		});

		it("should strip total words variation", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						response: "Content\nTotal Words: 150",
					}),
			});

			const result = await callLocalModelClient("prompt");

			expect(result).not.toContain("Total Words");
		});
	});
});
