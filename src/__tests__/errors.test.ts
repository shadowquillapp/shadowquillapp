import {
	CacheError,
	GenerationError,
	ModelError,
	NetworkError,
	PresetError,
	ShadowQuillError,
	StorageError,
	ValidationError,
	formatErrorLog,
	getUserMessage,
	isShadowQuillError,
	wrapError,
} from "@/lib/errors";
import { describe, expect, it } from "vitest";

describe("ShadowQuillError", () => {
	it("should create error with code and message", () => {
		const error = new ShadowQuillError("VALIDATION_ERROR", "Invalid input");
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.message).toBe("Invalid input");
		expect(error.name).toBe("ShadowQuillError");
	});

	it("should include timestamp", () => {
		const before = new Date();
		const error = new ShadowQuillError("GENERATION_ERROR", "Failed");
		const after = new Date();

		expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	it("should include details when provided", () => {
		const error = new ShadowQuillError("STORAGE_ERROR", "Save failed", {
			details: { key: "preset_123", operation: "write" },
		});
		expect(error.details).toEqual({ key: "preset_123", operation: "write" });
	});

	it("should include cause when provided", () => {
		const cause = new Error("Original error");
		const error = new ShadowQuillError("MODEL_ERROR", "Model failed", {
			cause,
		});
		expect(error.cause).toBe(cause);
	});

	it("should provide user-friendly message", () => {
		const error = new ShadowQuillError("VALIDATION_ERROR", "Technical details");
		expect(error.userMessage).toBe("The input provided is invalid.");
	});

	it("should serialize to JSON", () => {
		const error = new ShadowQuillError("CACHE_ERROR", "Cache miss", {
			details: { cacheType: "memory" },
		});
		const json = error.toJSON();

		expect(json.name).toBe("ShadowQuillError");
		expect(json.code).toBe("CACHE_ERROR");
		expect(json.message).toBe("Cache miss");
		expect(json.details).toEqual({ cacheType: "memory" });
		expect(typeof json.timestamp).toBe("string");
	});
});

describe("ValidationError", () => {
	it("should have VALIDATION_ERROR code", () => {
		const error = new ValidationError("Invalid field");
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.name).toBe("ValidationError");
	});

	it("should include field name", () => {
		const error = new ValidationError("Invalid email", { field: "email" });
		expect(error.field).toBe("email");
	});

	it("should include invalid value", () => {
		const error = new ValidationError("Value out of range", {
			field: "temperature",
			value: 2.5,
		});
		expect(error.value).toBe(2.5);
	});
});

describe("GenerationError", () => {
	it("should have GENERATION_ERROR code", () => {
		const error = new GenerationError("Generation failed");
		expect(error.code).toBe("GENERATION_ERROR");
		expect(error.name).toBe("GenerationError");
	});

	it("should include task type", () => {
		const error = new GenerationError("Failed", { taskType: "coding" });
		expect(error.taskType).toBe("coding");
	});

	it("should include input length", () => {
		const error = new GenerationError("Input too long", { inputLength: 50000 });
		expect(error.inputLength).toBe(50000);
	});
});

describe("StorageError", () => {
	it("should have STORAGE_ERROR code", () => {
		const error = new StorageError("Storage failed");
		expect(error.code).toBe("STORAGE_ERROR");
		expect(error.name).toBe("StorageError");
	});

	it("should include operation type", () => {
		const error = new StorageError("Write failed", { operation: "write" });
		expect(error.operation).toBe("write");
	});

	it("should include storage key", () => {
		const error = new StorageError("Key not found", { key: "preset_123" });
		expect(error.key).toBe("preset_123");
	});
});

describe("ModelError", () => {
	it("should have MODEL_ERROR code", () => {
		const error = new ModelError("Model unavailable");
		expect(error.code).toBe("MODEL_ERROR");
		expect(error.name).toBe("ModelError");
	});

	it("should include model ID", () => {
		const error = new ModelError("Model failed", { modelId: "gemma3:4b" });
		expect(error.modelId).toBe("gemma3:4b");
	});

	it("should include status code", () => {
		const error = new ModelError("Server error", { statusCode: 500 });
		expect(error.statusCode).toBe(500);
	});

	it("should indicate timeout", () => {
		const error = new ModelError("Request timed out", { isTimeout: true });
		expect(error.isTimeout).toBe(true);
	});
});

describe("CacheError", () => {
	it("should have CACHE_ERROR code", () => {
		const error = new CacheError("Cache operation failed");
		expect(error.code).toBe("CACHE_ERROR");
		expect(error.name).toBe("CacheError");
	});

	it("should include cache type", () => {
		const error = new CacheError("Cache miss", { cacheType: "session" });
		expect(error.cacheType).toBe("session");
	});
});

describe("NetworkError", () => {
	it("should have NETWORK_ERROR code", () => {
		const error = new NetworkError("Connection failed");
		expect(error.code).toBe("NETWORK_ERROR");
		expect(error.name).toBe("NetworkError");
	});

	it("should include endpoint", () => {
		const error = new NetworkError("Failed", {
			endpoint: "http://localhost:11434/api/generate",
		});
		expect(error.endpoint).toBe("http://localhost:11434/api/generate");
	});

	it("should include status code", () => {
		const error = new NetworkError("Service unavailable", { statusCode: 503 });
		expect(error.statusCode).toBe(503);
	});

	it("should indicate timeout", () => {
		const error = new NetworkError("Connection timeout", { isTimeout: true });
		expect(error.isTimeout).toBe(true);
	});
});

describe("PresetError", () => {
	it("should have PRESET_ERROR code", () => {
		const error = new PresetError("Preset operation failed");
		expect(error.code).toBe("PRESET_ERROR");
		expect(error.name).toBe("PresetError");
	});

	it("should include preset ID", () => {
		const error = new PresetError("Preset not found", {
			presetId: "preset_123",
		});
		expect(error.presetId).toBe("preset_123");
	});

	it("should include preset name", () => {
		const error = new PresetError("Invalid preset", {
			presetName: "My Preset",
		});
		expect(error.presetName).toBe("My Preset");
	});

	it("should include operation type", () => {
		const error = new PresetError("Failed to create", { operation: "create" });
		expect(error.operation).toBe("create");
	});
});

describe("isShadowQuillError", () => {
	it("should return true for ShadowQuillError", () => {
		const error = new ShadowQuillError("VALIDATION_ERROR", "Test");
		expect(isShadowQuillError(error)).toBe(true);
	});

	it("should return true for subclass errors", () => {
		const error = new ValidationError("Test");
		expect(isShadowQuillError(error)).toBe(true);
	});

	it("should return false for regular Error", () => {
		const error = new Error("Test");
		expect(isShadowQuillError(error)).toBe(false);
	});

	it("should return false for non-error values", () => {
		expect(isShadowQuillError("error string")).toBe(false);
		expect(isShadowQuillError(null)).toBe(false);
		expect(isShadowQuillError(undefined)).toBe(false);
		expect(isShadowQuillError({ message: "error" })).toBe(false);
	});
});

describe("wrapError", () => {
	it("should return ShadowQuillError as-is", () => {
		const original = new ValidationError("Already typed");
		const wrapped = wrapError(original);
		expect(wrapped).toBe(original);
	});

	it("should wrap regular Error", () => {
		const original = new Error("Original message");
		const wrapped = wrapError(original);

		expect(isShadowQuillError(wrapped)).toBe(true);
		expect(wrapped.message).toBe("Original message");
		expect(wrapped.cause).toBe(original);
	});

	it("should use provided code", () => {
		const original = new Error("Network issue");
		const wrapped = wrapError(original, "NETWORK_ERROR");

		expect(wrapped.code).toBe("NETWORK_ERROR");
	});

	it("should use provided message over original", () => {
		const original = new Error("Technical details");
		const wrapped = wrapError(original, "GENERATION_ERROR", "User friendly");

		expect(wrapped.message).toBe("User friendly");
	});

	it("should handle non-Error values", () => {
		const wrapped = wrapError("string error");
		expect(isShadowQuillError(wrapped)).toBe(true);
		expect(wrapped.message).toBe("An unexpected error occurred");
	});
});

describe("getUserMessage", () => {
	it("should return userMessage for ShadowQuillError", () => {
		const error = new ValidationError("Technical details");
		expect(getUserMessage(error)).toBe("The input provided is invalid.");
	});

	it("should return message for regular Error", () => {
		const error = new Error("Something went wrong");
		expect(getUserMessage(error)).toBe("Something went wrong");
	});

	it("should return default message for non-errors", () => {
		expect(getUserMessage("string")).toBe("An unexpected error occurred");
		expect(getUserMessage(null)).toBe("An unexpected error occurred");
	});
});

describe("formatErrorLog", () => {
	it("should format ShadowQuillError as JSON", () => {
		const error = new ValidationError("Invalid", { field: "email" });
		const log = formatErrorLog(error);
		const parsed = JSON.parse(log);

		expect(parsed.name).toBe("ValidationError");
		expect(parsed.code).toBe("VALIDATION_ERROR");
	});

	it("should format regular Error", () => {
		const error = new Error("Regular error");
		const log = formatErrorLog(error);
		const parsed = JSON.parse(log);

		expect(parsed.name).toBe("Error");
		expect(parsed.message).toBe("Regular error");
	});

	it("should handle non-error values", () => {
		const log = formatErrorLog("string error");
		expect(log).toBe("string error");
	});
});

describe("userMessage for all error codes", () => {
	it("should return correct message for GENERATION_ERROR", () => {
		const error = new ShadowQuillError("GENERATION_ERROR", "test");
		expect(error.userMessage).toBe("Failed to generate the prompt.");
	});

	it("should return correct message for STORAGE_ERROR", () => {
		const error = new ShadowQuillError("STORAGE_ERROR", "test");
		expect(error.userMessage).toBe("Failed to save or load data.");
	});

	it("should return correct message for MODEL_ERROR", () => {
		const error = new ShadowQuillError("MODEL_ERROR", "test");
		expect(error.userMessage).toBe("The AI model encountered an error.");
	});

	it("should return correct message for CACHE_ERROR", () => {
		const error = new ShadowQuillError("CACHE_ERROR", "test");
		expect(error.userMessage).toBe("Cache operation failed.");
	});

	it("should return correct message for NETWORK_ERROR", () => {
		const error = new ShadowQuillError("NETWORK_ERROR", "test");
		expect(error.userMessage).toBe("Network connection failed.");
	});

	it("should return correct message for PRESET_ERROR", () => {
		const error = new ShadowQuillError("PRESET_ERROR", "test");
		expect(error.userMessage).toBe("Preset operation failed.");
	});
});

describe("NetworkError full options", () => {
	it("should include all network error properties", () => {
		const cause = new Error("Connection reset");
		const error = new NetworkError("Request failed", {
			endpoint: "http://example.com/api",
			statusCode: 503,
			isTimeout: true,
			details: { retryCount: 3 },
			cause,
		});

		expect(error.endpoint).toBe("http://example.com/api");
		expect(error.statusCode).toBe(503);
		expect(error.isTimeout).toBe(true);
		expect(error.details).toEqual({ retryCount: 3 });
		expect(error.cause).toBe(cause);
	});
});

describe("PresetError full options", () => {
	it("should include all preset error properties", () => {
		const cause = new Error("Disk full");
		const error = new PresetError("Failed to save preset", {
			presetId: "preset_456",
			presetName: "My Preset",
			operation: "update",
			details: { size: 5000 },
			cause,
		});

		expect(error.presetId).toBe("preset_456");
		expect(error.presetName).toBe("My Preset");
		expect(error.operation).toBe("update");
		expect(error.details).toEqual({ size: 5000 });
		expect(error.cause).toBe(cause);
	});
});

describe("CacheError with cause", () => {
	it("should include cause in cache error", () => {
		const cause = new Error("Memory limit exceeded");
		const error = new CacheError("Cache write failed", {
			cacheType: "memory",
			cause,
		});

		expect(error.cause).toBe(cause);
	});
});

describe("StorageError with cause", () => {
	it("should include cause in storage error", () => {
		const cause = new Error("Disk error");
		const error = new StorageError("Write failed", {
			operation: "write",
			key: "settings",
			cause,
		});

		expect(error.cause).toBe(cause);
	});
});

describe("GenerationError with cause", () => {
	it("should include cause in generation error", () => {
		const cause = new Error("Token limit exceeded");
		const error = new GenerationError("Generation failed", {
			taskType: "coding",
			inputLength: 50000,
			details: { model: "gemma3:4b" },
			cause,
		});

		expect(error.cause).toBe(cause);
		expect(error.details).toEqual({ model: "gemma3:4b" });
	});
});

describe("ModelError with cause", () => {
	it("should include cause in model error", () => {
		const cause = new Error("GPU OOM");
		const error = new ModelError("Model crashed", {
			modelId: "gemma3:27b",
			statusCode: 500,
			isTimeout: false,
			details: { gpuMemory: "8GB" },
			cause,
		});

		expect(error.cause).toBe(cause);
		expect(error.details).toEqual({ gpuMemory: "8GB" });
	});
});

describe("ValidationError with details", () => {
	it("should include details in validation error", () => {
		const error = new ValidationError("Field validation failed", {
			field: "temperature",
			value: 2.5,
			details: { min: 0, max: 2 },
		});

		expect(error.details).toEqual({ min: 0, max: 2 });
	});
});

describe("Error.captureStackTrace", () => {
	it("should maintain stack trace", () => {
		const error = new ShadowQuillError("VALIDATION_ERROR", "Test error");
		expect(error.stack).toBeDefined();
		expect(error.stack).toContain("Test error");
	});
});

describe("wrapError edge cases", () => {
	it("should handle null error", () => {
		const wrapped = wrapError(null);
		expect(isShadowQuillError(wrapped)).toBe(true);
		expect(wrapped.message).toBe("An unexpected error occurred");
	});

	it("should handle number error", () => {
		const wrapped = wrapError(404);
		expect(isShadowQuillError(wrapped)).toBe(true);
		expect(wrapped.details?.originalType).toBe("number");
	});

	it("should handle object error", () => {
		const wrapped = wrapError({ code: 500, msg: "error" });
		expect(isShadowQuillError(wrapped)).toBe(true);
		expect(wrapped.details?.originalType).toBe("object");
	});
});
