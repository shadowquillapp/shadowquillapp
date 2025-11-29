import {
	listAvailableModels,
	readLocalModelConfig,
	validateLocalModelConnection,
	writeLocalModelConfig,
} from "@/lib/local-config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("local-config", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("readLocalModelConfig", () => {
		it("should return null when no config is stored", () => {
			const result = readLocalModelConfig();
			expect(result).toBeNull();
		});

		it("should return null when provider is missing", () => {
			localStorage.setItem("MODEL_BASE_URL", '"http://localhost:11434"');
			localStorage.setItem("MODEL_NAME", '"gemma3:4b"');

			const result = readLocalModelConfig();
			expect(result).toBeNull();
		});

		it("should return null when baseUrl is missing", () => {
			localStorage.setItem("MODEL_PROVIDER", '"ollama"');
			localStorage.setItem("MODEL_NAME", '"gemma3:4b"');

			const result = readLocalModelConfig();
			expect(result).toBeNull();
		});

		it("should return null when model is missing", () => {
			localStorage.setItem("MODEL_PROVIDER", '"ollama"');
			localStorage.setItem("MODEL_BASE_URL", '"http://localhost:11434"');

			const result = readLocalModelConfig();
			expect(result).toBeNull();
		});

		it("should return config when all values are present", () => {
			localStorage.setItem("MODEL_PROVIDER", '"ollama"');
			localStorage.setItem("MODEL_BASE_URL", '"http://localhost:11434"');
			localStorage.setItem("MODEL_NAME", '"gemma3:4b"');

			const result = readLocalModelConfig();
			expect(result).toEqual({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
		});

		it("should always return provider as 'ollama' regardless of stored value", () => {
			localStorage.setItem("MODEL_PROVIDER", '"other-provider"');
			localStorage.setItem("MODEL_BASE_URL", '"http://localhost:11434"');
			localStorage.setItem("MODEL_NAME", '"gemma3:4b"');

			const result = readLocalModelConfig();
			expect(result?.provider).toBe("ollama");
		});
	});

	describe("writeLocalModelConfig", () => {
		it("should store config in localStorage", () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			writeLocalModelConfig(config);

			expect(JSON.parse(localStorage.getItem("MODEL_PROVIDER") || "")).toBe(
				"ollama",
			);
			expect(JSON.parse(localStorage.getItem("MODEL_BASE_URL") || "")).toBe(
				"http://localhost:11434",
			);
			expect(JSON.parse(localStorage.getItem("MODEL_NAME") || "")).toBe(
				"gemma3:4b",
			);
		});

		it("should throw error when provider is missing", () => {
			const config = {
				provider: "" as unknown as "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			expect(() => writeLocalModelConfig(config)).toThrow(
				"Invalid model configuration",
			);
		});

		it("should throw error when baseUrl is missing", () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "",
				model: "gemma3:4b",
			};

			expect(() => writeLocalModelConfig(config)).toThrow(
				"Invalid model configuration",
			);
		});

		it("should throw error when model is missing", () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "",
			};

			expect(() => writeLocalModelConfig(config)).toThrow(
				"Invalid model configuration",
			);
		});
	});

	describe("validateLocalModelConnection", () => {
		it("should return not-configured error when no config exists", async () => {
			const result = await validateLocalModelConnection();
			expect(result).toEqual({ ok: false, error: "not-configured" });
		});

		it("should return unsupported-provider error for non-ollama provider", async () => {
			const config = {
				provider: "openai" as unknown as "ollama",
				baseUrl: "http://localhost:11434",
				model: "gpt-4",
			};

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "unsupported-provider" });
		});

		it("should return unreachable error when fetch fails with non-ok response", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "unreachable" });
		});

		it("should return no-models-found error when models array is empty", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "no-models-found" });
		});

		it("should return model-not-found error when specified model is not in list", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:27b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ name: "gemma3:4b" }, { name: "gemma3:12b" }],
					}),
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "model-not-found" });
		});

		it("should return ok when model is found (case insensitive)", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "GEMMA3:4B",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ name: "gemma3:4b" }],
					}),
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: true });
		});

		it("should match model by id if name is not available", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ id: "gemma3:4b" }],
					}),
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: true });
		});

		it("should match model by id when name is empty string", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ name: "", id: "gemma3:4b" }],
					}),
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: true });
		});

		it("should return timeout error when fetch is aborted", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			const abortError = new Error("Aborted");
			(abortError as { name: string }).name = "AbortError";
			global.fetch = vi.fn().mockRejectedValue(abortError);

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "timeout" });
		});

		it("should return unreachable error for network errors", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "unreachable" });
		});

		it("should strip trailing slash from baseUrl", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434/",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [{ name: "gemma3:4b" }] }),
			});

			await validateLocalModelConnection(config);

			expect(global.fetch).toHaveBeenCalledWith(
				"http://localhost:11434/api/tags",
				expect.any(Object),
			);
		});

		it("should handle malformed JSON response", async () => {
			const config = {
				provider: "ollama" as const,
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.reject(new Error("Invalid JSON")),
			});

			const result = await validateLocalModelConnection(config);
			expect(result).toEqual({ ok: false, error: "no-models-found" });
		});

		it("should use stored config when none is provided", async () => {
			localStorage.setItem("MODEL_PROVIDER", '"ollama"');
			localStorage.setItem("MODEL_BASE_URL", '"http://localhost:11434"');
			localStorage.setItem("MODEL_NAME", '"gemma3:4b"');

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [{ name: "gemma3:4b" }] }),
			});

			const result = await validateLocalModelConnection();
			expect(result).toEqual({ ok: true });
			expect(global.fetch).toHaveBeenCalledWith(
				"http://localhost:11434/api/tags",
				expect.any(Object),
			);
		});
	});

	describe("listAvailableModels", () => {
		it("should return empty array when fetch fails", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			const result = await listAvailableModels("http://localhost:11434");
			expect(result).toEqual([]);
		});

		it("should return empty array for malformed JSON", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.reject(new Error("Invalid JSON")),
			});

			const result = await listAvailableModels("http://localhost:11434");
			expect(result).toEqual([]);
		});

		it("should filter to only allowed Gemma 3 models", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [
							{ name: "gemma3:4b", size: 1000 },
							{ name: "gemma3:12b", size: 2000 },
							{ name: "gemma3:27b", size: 3000 },
							{ name: "llama2:7b", size: 4000 },
							{ name: "codellama:13b", size: 5000 },
						],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result).toHaveLength(3);
			expect(result.map((m) => m.name)).toEqual([
				"gemma3:4b",
				"gemma3:12b",
				"gemma3:27b",
			]);
		});

		it("should deduplicate models by name", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [
							{ name: "gemma3:4b", size: 1000 },
							{ name: "gemma3:4b", size: 1000 },
							{ name: "GEMMA3:4B", size: 1000 },
						],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("gemma3:4b");
		});

		it("should sort models by predefined order", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [
							{ name: "gemma3:27b", size: 3000 },
							{ name: "gemma3:4b", size: 1000 },
							{ name: "gemma3:12b", size: 2000 },
						],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result.map((m) => m.name)).toEqual([
				"gemma3:4b",
				"gemma3:12b",
				"gemma3:27b",
			]);
		});

		it("should sort two models correctly", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [
							{ name: "gemma3:12b", size: 2000 },
							{ name: "gemma3:4b", size: 1000 },
						],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result.map((m) => m.name)).toEqual(["gemma3:4b", "gemma3:12b"]);
		});

		it("should use model id as fallback when name is not available", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ id: "gemma3:4b", size: 1000 }],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("gemma3:4b");
		});

		it("should filter out models with empty names", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [
							{ name: "gemma3:4b", size: 1000 },
							{ name: "", size: 500 },
							{ size: 600 },
						],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result).toHaveLength(1);
		});

		it("should strip trailing slash from baseUrl", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			await listAvailableModels("http://localhost:11434/");

			expect(global.fetch).toHaveBeenCalledWith(
				"http://localhost:11434/api/tags",
			);
		});

		it("should handle missing models field in response", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			});

			const result = await listAvailableModels("http://localhost:11434");
			expect(result).toEqual([]);
		});

		it("should handle null models field in response", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: null }),
			});

			const result = await listAvailableModels("http://localhost:11434");
			expect(result).toEqual([]);
		});

		it("should include size in response", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ name: "gemma3:4b", size: 2500000000 }],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result[0]?.size).toBe(2500000000);
		});

		it("should default size to 0 when not provided", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						models: [{ name: "gemma3:4b" }],
					}),
			});

			const result = await listAvailableModels("http://localhost:11434");

			expect(result[0]?.size).toBe(0);
		});
	});
});
