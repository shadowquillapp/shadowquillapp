import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJSON, setJSON } from "@/lib/local-storage";
import {
	DEFAULT_BUILD_PROMPT,
	ensureSystemPromptBuild,
	getSystemPromptBuild,
	resetSystemPromptBuild,
	setSystemPromptBuild,
} from "@/lib/system-prompts";

const STORAGE_KEY = "SYSTEM_PROMPT_BUILD";

describe("system-prompts", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("DEFAULT_BUILD_PROMPT", () => {
		it("should be a non-empty string", () => {
			expect(typeof DEFAULT_BUILD_PROMPT).toBe("string");
			expect(DEFAULT_BUILD_PROMPT.length).toBeGreaterThan(0);
		});

		it("should contain key role information", () => {
			expect(DEFAULT_BUILD_PROMPT).toContain("ShadowQuill");
			expect(DEFAULT_BUILD_PROMPT).toContain("prompt enhancement specialist");
		});

		it("should contain critical rules about behavior", () => {
			expect(DEFAULT_BUILD_PROMPT).toContain("PROMPT ENHANCER");
			expect(DEFAULT_BUILD_PROMPT).toContain("NEVER");
		});
	});

	describe("getSystemPromptBuild", () => {
		it("should return DEFAULT_BUILD_PROMPT when nothing is stored", () => {
			const result = getSystemPromptBuild();
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return stored prompt when one exists", () => {
			const customPrompt = "My custom system prompt";
			setJSON(STORAGE_KEY, customPrompt);

			const result = getSystemPromptBuild();
			expect(result).toBe(customPrompt);
		});

		it("should return DEFAULT_BUILD_PROMPT when stored value is empty string", () => {
			setJSON(STORAGE_KEY, "");

			const result = getSystemPromptBuild();
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return DEFAULT_BUILD_PROMPT when stored value is only whitespace", () => {
			setJSON(STORAGE_KEY, "   \n\t  ");

			const result = getSystemPromptBuild();
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should trim whitespace from stored prompt", () => {
			const customPrompt = "  Custom prompt with whitespace  ";
			setJSON(STORAGE_KEY, customPrompt);

			const result = getSystemPromptBuild();
			expect(result).toBe("Custom prompt with whitespace");
		});
	});

	describe("ensureSystemPromptBuild", () => {
		it("should return stored prompt when one exists", () => {
			const customPrompt = "Existing custom prompt";
			setJSON(STORAGE_KEY, customPrompt);

			const result = ensureSystemPromptBuild();
			expect(result).toBe(customPrompt);
		});

		it("should write DEFAULT_BUILD_PROMPT when nothing is stored", () => {
			const result = ensureSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should write DEFAULT_BUILD_PROMPT when stored value is empty", () => {
			setJSON(STORAGE_KEY, "");

			const result = ensureSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should write DEFAULT_BUILD_PROMPT when stored value is only whitespace", () => {
			setJSON(STORAGE_KEY, "   ");

			const result = ensureSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should not overwrite existing valid prompt", () => {
			const customPrompt = "Valid custom prompt";
			setJSON(STORAGE_KEY, customPrompt);

			ensureSystemPromptBuild();

			expect(getJSON<string>(STORAGE_KEY, "")).toBe(customPrompt);
		});
	});

	describe("setSystemPromptBuild", () => {
		it("should store the provided prompt", () => {
			const newPrompt = "New system prompt";

			const result = setSystemPromptBuild(newPrompt);

			expect(result).toBe(newPrompt);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(newPrompt);
		});

		it("should trim whitespace from the prompt", () => {
			const newPrompt = "  Prompt with whitespace  ";

			const result = setSystemPromptBuild(newPrompt);

			expect(result).toBe("Prompt with whitespace");
			expect(getJSON<string>(STORAGE_KEY, "")).toBe("Prompt with whitespace");
		});

		it("should return DEFAULT_BUILD_PROMPT when empty string is provided", () => {
			const result = setSystemPromptBuild("");

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return DEFAULT_BUILD_PROMPT when only whitespace is provided", () => {
			const result = setSystemPromptBuild("   \n\t  ");

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should overwrite existing prompt", () => {
			setJSON(STORAGE_KEY, "Old prompt");

			const result = setSystemPromptBuild("New prompt");

			expect(result).toBe("New prompt");
			expect(getJSON<string>(STORAGE_KEY, "")).toBe("New prompt");
		});

		it("should handle multiline prompts", () => {
			const multilinePrompt = `Line 1
Line 2
Line 3`;

			const result = setSystemPromptBuild(multilinePrompt);

			expect(result).toBe(multilinePrompt);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(multilinePrompt);
		});

		it("should handle prompts with special characters", () => {
			const specialPrompt = "Prompt with <special> & \"characters\" 'here'";

			const result = setSystemPromptBuild(specialPrompt);

			expect(result).toBe(specialPrompt);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(specialPrompt);
		});
	});

	describe("resetSystemPromptBuild", () => {
		it("should reset to DEFAULT_BUILD_PROMPT", () => {
			setJSON(STORAGE_KEY, "Custom prompt");

			const result = resetSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return DEFAULT_BUILD_PROMPT even when nothing was stored", () => {
			const result = resetSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should overwrite any existing value", () => {
			setJSON(STORAGE_KEY, "Very long custom prompt...");

			resetSystemPromptBuild();

			expect(getJSON<string>(STORAGE_KEY, "")).toBe(DEFAULT_BUILD_PROMPT);
		});
	});

	describe("normalization behavior", () => {
		it("should handle null values gracefully", () => {
			// This tests the normalize helper internally via getSystemPromptBuild
			// when localStorage returns null
			expect(() => getSystemPromptBuild()).not.toThrow();
		});

		it("should handle undefined values gracefully", () => {
			// Set to undefined-like state
			localStorage.removeItem(STORAGE_KEY);

			expect(() => getSystemPromptBuild()).not.toThrow();
			expect(getSystemPromptBuild()).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should normalize null prompt to DEFAULT_BUILD_PROMPT via setSystemPromptBuild", () => {
			// @ts-expect-error - intentionally passing null to test normalization
			const result = setSystemPromptBuild(null);
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should normalize undefined prompt to DEFAULT_BUILD_PROMPT via setSystemPromptBuild", () => {
			// @ts-expect-error - intentionally passing undefined to test normalization
			const result = setSystemPromptBuild(undefined);
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});
	});

	describe("localStorage edge cases", () => {
		it("should handle very long prompts", () => {
			const longPrompt = "x".repeat(100000);

			const result = setSystemPromptBuild(longPrompt);

			expect(result).toBe(longPrompt);
			expect(getSystemPromptBuild()).toBe(longPrompt);
		});

		it("should handle unicode characters", () => {
			const unicodePrompt = "日本語 🎉 émojis and spëcial çhàracters";

			const result = setSystemPromptBuild(unicodePrompt);

			expect(result).toBe(unicodePrompt);
			expect(getSystemPromptBuild()).toBe(unicodePrompt);
		});
	});

	describe("localStorage error handling", () => {
		it("should return DEFAULT_BUILD_PROMPT when localStorage.getItem throws", async () => {
			// Reset module to get fresh instance that will use our mocked localStorage
			vi.resetModules();

			const originalGetItem = localStorage.getItem.bind(localStorage);
			localStorage.getItem = () => {
				throw new Error("localStorage disabled");
			};

			const freshModule = await import("@/lib/system-prompts");
			const result = freshModule.getSystemPromptBuild();
			expect(result).toBe(freshModule.DEFAULT_BUILD_PROMPT);

			localStorage.getItem = originalGetItem;
		});

		it("should not throw when localStorage.setItem throws", async () => {
			vi.resetModules();

			const originalSetItem = localStorage.setItem.bind(localStorage);
			localStorage.setItem = () => {
				throw new Error("QuotaExceededError");
			};

			const freshModule = await import("@/lib/system-prompts");
			expect(() =>
				freshModule.setSystemPromptBuild("test prompt"),
			).not.toThrow();
			expect(() => freshModule.resetSystemPromptBuild()).not.toThrow();

			localStorage.setItem = originalSetItem;
		});

		it("should handle ensureSystemPromptBuild when localStorage.setItem throws", async () => {
			vi.resetModules();

			const originalSetItem = localStorage.setItem.bind(localStorage);
			localStorage.setItem = () => {
				throw new Error("QuotaExceededError");
			};

			const freshModule = await import("@/lib/system-prompts");
			// Should not throw and should return DEFAULT_BUILD_PROMPT
			expect(() => freshModule.ensureSystemPromptBuild()).not.toThrow();
			const result = freshModule.ensureSystemPromptBuild();
			expect(result).toBe(freshModule.DEFAULT_BUILD_PROMPT);

			localStorage.setItem = originalSetItem;
		});
	});

	describe("SSR safety (window undefined)", () => {
		const originalWindow = global.window;

		beforeEach(() => {
			// @ts-expect-error - intentionally setting window to undefined for SSR testing
			global.window = undefined;
		});

		afterEach(() => {
			global.window = originalWindow;
		});

		it("getSystemPromptBuild should return DEFAULT_BUILD_PROMPT when window is undefined", async () => {
			vi.resetModules();
			const freshModule = await import("@/lib/system-prompts");
			const result = freshModule.getSystemPromptBuild();
			expect(result).toBe(freshModule.DEFAULT_BUILD_PROMPT);
		});

		it("ensureSystemPromptBuild should return DEFAULT_BUILD_PROMPT when window is undefined", async () => {
			vi.resetModules();
			const freshModule = await import("@/lib/system-prompts");
			const result = freshModule.ensureSystemPromptBuild();
			expect(result).toBe(freshModule.DEFAULT_BUILD_PROMPT);
		});

		it("setSystemPromptBuild should return normalized prompt when window is undefined", async () => {
			vi.resetModules();
			const freshModule = await import("@/lib/system-prompts");
			const result = freshModule.setSystemPromptBuild("  my prompt  ");
			expect(result).toBe("my prompt");
		});

		it("setSystemPromptBuild should return DEFAULT_BUILD_PROMPT for empty prompt when window is undefined", async () => {
			vi.resetModules();
			const freshModule = await import("@/lib/system-prompts");
			const result = freshModule.setSystemPromptBuild("");
			expect(result).toBe(freshModule.DEFAULT_BUILD_PROMPT);
		});

		it("resetSystemPromptBuild should return DEFAULT_BUILD_PROMPT when window is undefined", async () => {
			vi.resetModules();
			const freshModule = await import("@/lib/system-prompts");
			const result = freshModule.resetSystemPromptBuild();
			expect(result).toBe(freshModule.DEFAULT_BUILD_PROMPT);
		});
	});
});
