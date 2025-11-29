import {
	clearAllStorageForFactoryReset,
	getJSON,
	isFactoryResetInProgress,
	remove,
	setJSON,
} from "@/lib/local-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Helper to access internal state - we need to reload the module to reset state
const resetModule = async () => {
	vi.resetModules();
	// Re-import to get fresh module state
	const module = await import("@/lib/local-storage");
	return module;
};

describe("getJSON", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("should return parsed JSON from localStorage", () => {
		const data = { key: "value", num: 42 };
		localStorage.setItem("test-key", JSON.stringify(data));

		const result = getJSON("test-key", {});
		expect(result).toEqual(data);
	});

	it("should return default value when key does not exist", () => {
		const defaultValue = { default: true };
		const result = getJSON("non-existent", defaultValue);
		expect(result).toEqual(defaultValue);
	});

	it("should return default value for invalid JSON", () => {
		localStorage.setItem("invalid", "not valid json {");
		const result = getJSON("invalid", { fallback: true });
		expect(result).toEqual({ fallback: true });
	});

	it("should return default value when localStorage returns null", () => {
		const result = getJSON("missing", [1, 2, 3]);
		expect(result).toEqual([1, 2, 3]);
	});

	it("should handle arrays", () => {
		localStorage.setItem("array", JSON.stringify([1, 2, 3]));
		const result = getJSON<number[]>("array", []);
		expect(result).toEqual([1, 2, 3]);
	});

	it("should handle primitive values", () => {
		localStorage.setItem("string", JSON.stringify("hello"));
		localStorage.setItem("number", JSON.stringify(42));
		localStorage.setItem("boolean", JSON.stringify(true));

		expect(getJSON("string", "")).toBe("hello");
		expect(getJSON("number", 0)).toBe(42);
		expect(getJSON("boolean", false)).toBe(true);
	});

	it("should handle null stored value", () => {
		localStorage.setItem("null", JSON.stringify(null));
		const result = getJSON("null", "default");
		expect(result).toBeNull();
	});
});

describe("setJSON", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("should store JSON in localStorage", () => {
		const data = { name: "test", value: 123 };
		setJSON("my-key", data);

		const stored = localStorage.getItem("my-key");
		expect(stored).toBe(JSON.stringify(data));
	});

	it("should handle arrays", () => {
		setJSON("array", [1, 2, 3]);
		expect(localStorage.getItem("array")).toBe("[1,2,3]");
	});

	it("should handle primitive values", () => {
		setJSON("str", "hello");
		setJSON("num", 42);
		setJSON("bool", true);

		expect(localStorage.getItem("str")).toBe('"hello"');
		expect(localStorage.getItem("num")).toBe("42");
		expect(localStorage.getItem("bool")).toBe("true");
	});

	it("should overwrite existing values", () => {
		setJSON("key", { old: true });
		setJSON("key", { new: true });

		const result = getJSON("key", {});
		expect(result).toEqual({ new: true });
	});
});

describe("remove", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("should remove item from localStorage", () => {
		localStorage.setItem("to-remove", "value");
		remove("to-remove");

		expect(localStorage.getItem("to-remove")).toBeNull();
	});

	it("should handle non-existent keys gracefully", () => {
		expect(() => remove("non-existent")).not.toThrow();
	});
});

describe("clearAllStorageForFactoryReset", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	it("should clear all localStorage items", async () => {
		const freshModule = await resetModule();

		localStorage.setItem("PC_PRESETS", "[]");
		localStorage.setItem("theme-preference", "dark");
		localStorage.setItem("custom-key", "value");

		freshModule.clearAllStorageForFactoryReset();

		expect(localStorage.length).toBe(0);
	});

	it("should clear sessionStorage", async () => {
		const freshModule = await resetModule();

		sessionStorage.setItem("session-key", "value");

		freshModule.clearAllStorageForFactoryReset();

		expect(sessionStorage.length).toBe(0);
	});

	it("should set factory reset flag to block writes", async () => {
		const freshModule = await resetModule();

		freshModule.clearAllStorageForFactoryReset();

		expect(freshModule.isFactoryResetInProgress()).toBe(true);
	});
});

describe("factory reset blocking", () => {
	it("should block setJSON calls during factory reset", async () => {
		const freshModule = await resetModule();

		// Trigger factory reset
		freshModule.clearAllStorageForFactoryReset();

		// Try to write - should be blocked
		freshModule.setJSON("blocked-key", { data: "should not be saved" });

		expect(localStorage.getItem("blocked-key")).toBeNull();
	});
});

describe("isFactoryResetInProgress", () => {
	it("should return false initially", async () => {
		const freshModule = await resetModule();
		expect(freshModule.isFactoryResetInProgress()).toBe(false);
	});

	it("should return true after factory reset initiated", async () => {
		const freshModule = await resetModule();

		freshModule.clearAllStorageForFactoryReset();

		expect(freshModule.isFactoryResetInProgress()).toBe(true);
	});
});

describe("SSR safety", () => {
	it("should handle window being undefined gracefully", () => {
		// The module checks typeof window !== 'undefined'
		// In jsdom environment, window exists, so we can't easily test this
		// But we can verify the functions don't throw
		expect(() => getJSON("key", null)).not.toThrow();
		expect(() => setJSON("key", "value")).not.toThrow();
		expect(() => remove("key")).not.toThrow();
	});

	describe("when window is undefined", () => {
		const originalWindow = global.window;

		beforeEach(() => {
			// @ts-expect-error - intentionally setting window to undefined for SSR testing
			global.window = undefined;
		});

		afterEach(() => {
			global.window = originalWindow;
		});

		it("getJSON should return default value when window is undefined", async () => {
			const freshModule = await resetModule();
			const result = freshModule.getJSON("any-key", { ssr: true });
			expect(result).toEqual({ ssr: true });
		});

		it("setJSON should not throw when window is undefined", async () => {
			const freshModule = await resetModule();
			expect(() =>
				freshModule.setJSON("any-key", { data: "value" }),
			).not.toThrow();
		});

		it("remove should not throw when window is undefined", async () => {
			const freshModule = await resetModule();
			expect(() => freshModule.remove("any-key")).not.toThrow();
		});

		it("clearAllStorageForFactoryReset should return early when window is undefined", async () => {
			const freshModule = await resetModule();
			// Should not throw and should not set the flag (returns early)
			expect(() => freshModule.clearAllStorageForFactoryReset()).not.toThrow();
			// The flag should not be set since we returned early
			expect(freshModule.isFactoryResetInProgress()).toBe(false);
		});
	});
});

describe("localStorage error handling", () => {
	it("should return default value when localStorage throws on getItem", () => {
		const originalGetItem = Storage.prototype.getItem;
		Storage.prototype.getItem = () => {
			throw new Error("localStorage disabled");
		};

		const result = getJSON("test-key", { fallback: true });
		expect(result).toEqual({ fallback: true });

		Storage.prototype.getItem = originalGetItem;
	});

	it("should silently fail when localStorage throws on setItem", () => {
		const originalSetItem = Storage.prototype.setItem;
		Storage.prototype.setItem = () => {
			throw new Error("QuotaExceededError");
		};

		// Should not throw
		expect(() => setJSON("test-key", { data: "value" })).not.toThrow();

		Storage.prototype.setItem = originalSetItem;
	});

	it("should silently fail when localStorage throws on removeItem", () => {
		const originalRemoveItem = Storage.prototype.removeItem;
		Storage.prototype.removeItem = () => {
			throw new Error("localStorage disabled");
		};

		// Should not throw
		expect(() => remove("test-key")).not.toThrow();

		Storage.prototype.removeItem = originalRemoveItem;
	});
});

describe("clearAllStorageForFactoryReset error handling", () => {
	it("should handle errors when removing individual keys", async () => {
		const freshModule = await resetModule();

		// Mock removeItem to throw for specific keys
		const originalRemoveItem = Storage.prototype.removeItem;
		let callCount = 0;
		Storage.prototype.removeItem = (key: string) => {
			callCount++;
			if (callCount % 2 === 0) {
				throw new Error(`Failed to remove ${key}`);
			}
			return originalRemoveItem.call(localStorage, key);
		};

		localStorage.setItem("PC_PRESETS", "[]");
		localStorage.setItem("theme-preference", "dark");

		// Should not throw even when individual removes fail
		expect(() => freshModule.clearAllStorageForFactoryReset()).not.toThrow();

		Storage.prototype.removeItem = originalRemoveItem;
	});

	it("should handle errors when clearing localStorage", async () => {
		const freshModule = await resetModule();

		const originalClear = Storage.prototype.clear;
		Storage.prototype.clear = () => {
			throw new Error("Clear failed");
		};

		// Should not throw
		expect(() => freshModule.clearAllStorageForFactoryReset()).not.toThrow();

		Storage.prototype.clear = originalClear;
	});

	it("should handle errors when clearing sessionStorage", async () => {
		const freshModule = await resetModule();

		const originalClear = sessionStorage.clear.bind(sessionStorage);
		sessionStorage.clear = () => {
			throw new Error("Session clear failed");
		};

		// Should not throw
		expect(() => freshModule.clearAllStorageForFactoryReset()).not.toThrow();

		sessionStorage.clear = originalClear;
	});
});

describe("getJSON with complex data", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("should handle nested objects", () => {
		const complexData = {
			level1: {
				level2: {
					level3: {
						value: "deep",
					},
				},
			},
		};
		localStorage.setItem("complex", JSON.stringify(complexData));

		const result = getJSON("complex", {});
		expect(result).toEqual(complexData);
	});

	it("should handle arrays of objects", () => {
		const arrayData = [
			{ id: 1, name: "first" },
			{ id: 2, name: "second" },
		];
		localStorage.setItem("array-obj", JSON.stringify(arrayData));

		const result = getJSON("array-obj", []);
		expect(result).toEqual(arrayData);
	});
});

describe("setJSON during factory reset", () => {
	it("should block setJSON calls after clearAllStorageForFactoryReset", async () => {
		const freshModule = await resetModule();

		// First set some data
		freshModule.setJSON("before-reset", { data: "exists" });
		expect(localStorage.getItem("before-reset")).not.toBeNull();

		// Trigger factory reset
		freshModule.clearAllStorageForFactoryReset();

		// Now try to set - should be blocked
		freshModule.setJSON("after-reset", { data: "should-not-exist" });
		expect(localStorage.getItem("after-reset")).toBeNull();
	});
});
