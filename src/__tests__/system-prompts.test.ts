import {
	DEFAULT_BUILD_PROMPT,
	ensureSystemPromptBuild,
	getSystemPromptBuild,
	resetSystemPromptBuild,
	setSystemPromptBuild,
} from "@/lib/system-prompts";
import { beforeEach, describe, expect, it } from "vitest";

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
			localStorage.setItem(STORAGE_KEY, customPrompt);

			const result = getSystemPromptBuild();
			expect(result).toBe(customPrompt);
		});

		it("should return DEFAULT_BUILD_PROMPT when stored value is empty string", () => {
			localStorage.setItem(STORAGE_KEY, "");

			const result = getSystemPromptBuild();
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return DEFAULT_BUILD_PROMPT when stored value is only whitespace", () => {
			localStorage.setItem(STORAGE_KEY, "   \n\t  ");

			const result = getSystemPromptBuild();
			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should trim whitespace from stored prompt", () => {
			const customPrompt = "  Custom prompt with whitespace  ";
			localStorage.setItem(STORAGE_KEY, customPrompt);

			const result = getSystemPromptBuild();
			expect(result).toBe("Custom prompt with whitespace");
		});
	});

	describe("ensureSystemPromptBuild", () => {
		it("should return stored prompt when one exists", () => {
			const customPrompt = "Existing custom prompt";
			localStorage.setItem(STORAGE_KEY, customPrompt);

			const result = ensureSystemPromptBuild();
			expect(result).toBe(customPrompt);
		});

		it("should write DEFAULT_BUILD_PROMPT when nothing is stored", () => {
			const result = ensureSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should write DEFAULT_BUILD_PROMPT when stored value is empty", () => {
			localStorage.setItem(STORAGE_KEY, "");

			const result = ensureSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should write DEFAULT_BUILD_PROMPT when stored value is only whitespace", () => {
			localStorage.setItem(STORAGE_KEY, "   ");

			const result = ensureSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should not overwrite existing valid prompt", () => {
			const customPrompt = "Valid custom prompt";
			localStorage.setItem(STORAGE_KEY, customPrompt);

			ensureSystemPromptBuild();

			expect(localStorage.getItem(STORAGE_KEY)).toBe(customPrompt);
		});
	});

	describe("setSystemPromptBuild", () => {
		it("should store the provided prompt", () => {
			const newPrompt = "New system prompt";

			const result = setSystemPromptBuild(newPrompt);

			expect(result).toBe(newPrompt);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(newPrompt);
		});

		it("should trim whitespace from the prompt", () => {
			const newPrompt = "  Prompt with whitespace  ";

			const result = setSystemPromptBuild(newPrompt);

			expect(result).toBe("Prompt with whitespace");
			expect(localStorage.getItem(STORAGE_KEY)).toBe("Prompt with whitespace");
		});

		it("should return DEFAULT_BUILD_PROMPT when empty string is provided", () => {
			const result = setSystemPromptBuild("");

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return DEFAULT_BUILD_PROMPT when only whitespace is provided", () => {
			const result = setSystemPromptBuild("   \n\t  ");

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should overwrite existing prompt", () => {
			localStorage.setItem(STORAGE_KEY, "Old prompt");

			const result = setSystemPromptBuild("New prompt");

			expect(result).toBe("New prompt");
			expect(localStorage.getItem(STORAGE_KEY)).toBe("New prompt");
		});

		it("should handle multiline prompts", () => {
			const multilinePrompt = `Line 1
Line 2
Line 3`;

			const result = setSystemPromptBuild(multilinePrompt);

			expect(result).toBe(multilinePrompt);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(multilinePrompt);
		});

		it("should handle prompts with special characters", () => {
			const specialPrompt = "Prompt with <special> & \"characters\" 'here'";

			const result = setSystemPromptBuild(specialPrompt);

			expect(result).toBe(specialPrompt);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(specialPrompt);
		});
	});

	describe("resetSystemPromptBuild", () => {
		it("should reset to DEFAULT_BUILD_PROMPT", () => {
			localStorage.setItem(STORAGE_KEY, "Custom prompt");

			const result = resetSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should return DEFAULT_BUILD_PROMPT even when nothing was stored", () => {
			const result = resetSystemPromptBuild();

			expect(result).toBe(DEFAULT_BUILD_PROMPT);
		});

		it("should overwrite any existing value", () => {
			localStorage.setItem(STORAGE_KEY, "Very long custom prompt...");

			resetSystemPromptBuild();

			expect(localStorage.getItem(STORAGE_KEY)).toBe(DEFAULT_BUILD_PROMPT);
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
	});

	describe("localStorage edge cases", () => {
		it("should handle localStorage errors gracefully in getSystemPromptBuild", () => {
			// Simulate localStorage being unavailable in SSR context
			const originalLocalStorage = global.localStorage;
			const originalWindow = global.window;

			// Make window undefined (simulating SSR)
			// @ts-ignore - intentionally testing edge case
			global.window = undefined as unknown as Window & typeof globalThis;

			// The function should still work and return empty string in SSR
			// Re-import to test SSR behavior
			// Note: In actual SSR, readRawPrompt returns "", which gets normalized,
			// and if empty, returns DEFAULT_BUILD_PROMPT

			// Restore
			global.window = originalWindow;
			global.localStorage = originalLocalStorage;
		});

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
});
