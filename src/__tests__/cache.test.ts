import {
	LRUCache,
	clearAllCaches,
	clearSessionCache,
	createPromptCacheKey,
	getFromSessionCache,
	getPromptCache,
	getTemplateCache,
	hashString,
	saveToSessionCache,
} from "@/lib/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("LRUCache", () => {
	describe("basic operations", () => {
		it("should set and get values", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			expect(cache.get("key1")).toBe("value1");
		});

		it("should return undefined for non-existent keys", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			expect(cache.get("nonexistent")).toBeUndefined();
		});

		it("should delete values", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			cache.delete("key1");
			expect(cache.get("key1")).toBeUndefined();
		});

		it("should clear all values", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.clear();
			expect(cache.size).toBe(0);
		});

		it("should report correct size", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			expect(cache.size).toBe(2);
		});

		it("should check if key exists", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			expect(cache.has("key1")).toBe(true);
			expect(cache.has("key2")).toBe(false);
		});
	});

	describe("LRU eviction", () => {
		it("should evict least recently used item when at capacity", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 3,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.set("key3", "value3");
			cache.set("key4", "value4"); // Should evict key1

			expect(cache.get("key1")).toBeUndefined();
			expect(cache.get("key2")).toBe("value2");
			expect(cache.get("key3")).toBe("value3");
			expect(cache.get("key4")).toBe("value4");
		});

		it("should update LRU order on access", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 3,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.set("key3", "value3");

			// Access key1 to make it most recently used
			cache.get("key1");

			// Add key4, should evict key2 (now least recently used)
			cache.set("key4", "value4");

			expect(cache.get("key1")).toBe("value1");
			expect(cache.get("key2")).toBeUndefined();
			expect(cache.get("key3")).toBe("value3");
			expect(cache.get("key4")).toBe("value4");
		});

		it("should update entry position on re-set", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 3,
				ttlMs: 0,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.set("key3", "value3");

			// Re-set key1 to make it most recently used
			cache.set("key1", "updated");

			// Add key4, should evict key2
			cache.set("key4", "value4");

			expect(cache.get("key1")).toBe("updated");
			expect(cache.get("key2")).toBeUndefined();
		});
	});

	describe("TTL expiration", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it("should return undefined for expired entries on get", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 1000, // 1 second TTL
			});
			cache.set("key1", "value1");

			// Advance time past TTL
			vi.advanceTimersByTime(1500);

			expect(cache.get("key1")).toBeUndefined();
		});

		it("should return value for non-expired entries", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 1000,
			});
			cache.set("key1", "value1");

			// Advance time but not past TTL
			vi.advanceTimersByTime(500);

			expect(cache.get("key1")).toBe("value1");
		});

		it("should report expired keys as not existing", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 1000,
			});
			cache.set("key1", "value1");

			vi.advanceTimersByTime(1500);

			expect(cache.has("key1")).toBe(false);
		});

		it("should prune expired entries", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 1000,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");

			vi.advanceTimersByTime(1500);

			const pruned = cache.prune();
			expect(pruned).toBe(2);
			expect(cache.size).toBe(0);
		});

		it("should not prune when TTL is 0", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 10,
				ttlMs: 0,
			});
			cache.set("key1", "value1");

			vi.advanceTimersByTime(100000);

			const pruned = cache.prune();
			expect(pruned).toBe(0);
			expect(cache.get("key1")).toBe("value1");
		});
	});

	describe("getStats", () => {
		it("should return cache statistics", () => {
			const cache = new LRUCache<string, string>({
				maxEntries: 100,
				ttlMs: 5000,
			});
			cache.set("key1", "value1");
			cache.set("key2", "value2");

			const stats = cache.getStats();
			expect(stats.size).toBe(2);
			expect(stats.maxEntries).toBe(100);
			expect(stats.ttlMs).toBe(5000);
		});
	});
});

describe("hashString", () => {
	it("should produce consistent hashes", () => {
		const hash1 = hashString("test string");
		const hash2 = hashString("test string");
		expect(hash1).toBe(hash2);
	});

	it("should produce different hashes for different strings", () => {
		const hash1 = hashString("string1");
		const hash2 = hashString("string2");
		expect(hash1).not.toBe(hash2);
	});

	it("should handle empty strings", () => {
		const hash = hashString("");
		expect(typeof hash).toBe("string");
		expect(hash.length).toBeGreaterThan(0);
	});
});

describe("createPromptCacheKey", () => {
	it("should create consistent keys for same input", () => {
		const key1 = createPromptCacheKey("test", "general", { tone: "formal" });
		const key2 = createPromptCacheKey("test", "general", { tone: "formal" });
		expect(key1).toBe(key2);
	});

	it("should create different keys for different inputs", () => {
		const key1 = createPromptCacheKey("test1", "general", {});
		const key2 = createPromptCacheKey("test2", "general", {});
		expect(key1).not.toBe(key2);
	});

	it("should create different keys for different task types", () => {
		const key1 = createPromptCacheKey("test", "general", {});
		const key2 = createPromptCacheKey("test", "coding", {});
		expect(key1).not.toBe(key2);
	});

	it("should create different keys for different options", () => {
		const key1 = createPromptCacheKey("test", "general", { tone: "formal" });
		const key2 = createPromptCacheKey("test", "general", { tone: "friendly" });
		expect(key1).not.toBe(key2);
	});

	it("should handle undefined options", () => {
		const key = createPromptCacheKey("test", "general", undefined);
		expect(typeof key).toBe("string");
	});

	it("should produce consistent keys regardless of object key order", () => {
		const key1 = createPromptCacheKey("test", "general", {
			tone: "formal",
			detail: "brief",
		});
		const key2 = createPromptCacheKey("test", "general", {
			detail: "brief",
			tone: "formal",
		});
		expect(key1).toBe(key2);
	});
});

describe("cache singletons", () => {
	it("should return same prompt cache instance", () => {
		const cache1 = getPromptCache();
		const cache2 = getPromptCache();
		expect(cache1).toBe(cache2);
	});

	it("should return same template cache instance", () => {
		const cache1 = getTemplateCache();
		const cache2 = getTemplateCache();
		expect(cache1).toBe(cache2);
	});

	it("should clear all caches", () => {
		const promptCache = getPromptCache();
		const templateCache = getTemplateCache();

		promptCache.set("test", "value");
		templateCache.set("test", { data: "value" });

		clearAllCaches();

		expect(promptCache.size).toBe(0);
		expect(templateCache.size).toBe(0);
	});
});

describe("session storage cache", () => {
	const mockSessionStorage: Record<string, string> = {};

	beforeEach(() => {
		// Clear mock storage
		for (const key of Object.keys(mockSessionStorage)) {
			delete mockSessionStorage[key];
		}

		// Mock sessionStorage
		vi.stubGlobal("sessionStorage", {
			getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockSessionStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockSessionStorage[key];
			}),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("saveToSessionCache", () => {
		it("should save a value to session storage", () => {
			saveToSessionCache("test-key", "test-value");

			const stored = JSON.parse(mockSessionStorage.SQ_PROMPT_CACHE ?? "{}");
			expect(stored.entries).toHaveLength(1);
			expect(stored.entries[0].key).toBe("test-key");
			expect(stored.entries[0].value).toBe("test-value");
		});

		it("should update existing entry with same key", () => {
			saveToSessionCache("test-key", "value-1");
			saveToSessionCache("test-key", "value-2");

			const stored = JSON.parse(mockSessionStorage.SQ_PROMPT_CACHE ?? "{}");
			expect(stored.entries).toHaveLength(1);
			expect(stored.entries[0].value).toBe("value-2");
		});

		it("should limit entries to maximum size", () => {
			// Add 25 entries (max is 20)
			for (let i = 0; i < 25; i++) {
				saveToSessionCache(`key-${i}`, `value-${i}`);
			}

			const stored = JSON.parse(mockSessionStorage.SQ_PROMPT_CACHE ?? "{}");
			expect(stored.entries).toHaveLength(20);

			// Should keep most recent entries (5-24)
			expect(stored.entries[0].key).toBe("key-5");
			expect(stored.entries[19].key).toBe("key-24");
		});

		it("should include timestamp in entries", () => {
			const before = Date.now();
			saveToSessionCache("test-key", "test-value");
			const after = Date.now();

			const stored = JSON.parse(mockSessionStorage.SQ_PROMPT_CACHE ?? "{}");
			expect(stored.entries[0].timestamp).toBeGreaterThanOrEqual(before);
			expect(stored.entries[0].timestamp).toBeLessThanOrEqual(after);
		});

		it("should handle storage errors gracefully", () => {
			vi.stubGlobal("sessionStorage", {
				getItem: vi.fn(() => null),
				setItem: vi.fn(() => {
					throw new Error("QuotaExceededError");
				}),
				removeItem: vi.fn(),
			});

			// Should not throw
			expect(() => {
				saveToSessionCache("test-key", "test-value");
			}).not.toThrow();
		});

		it("should do nothing in server-side environment", () => {
			vi.stubGlobal("window", undefined);

			// Should not throw
			expect(() => {
				saveToSessionCache("test-key", "test-value");
			}).not.toThrow();
		});
	});

	describe("getFromSessionCache", () => {
		it("should retrieve a saved value", () => {
			saveToSessionCache("test-key", "test-value");

			const value = getFromSessionCache("test-key");
			expect(value).toBe("test-value");
		});

		it("should return undefined for non-existent key", () => {
			const value = getFromSessionCache("non-existent");
			expect(value).toBeUndefined();
		});

		it("should return undefined when cache is empty", () => {
			const value = getFromSessionCache("any-key");
			expect(value).toBeUndefined();
		});

		it("should handle corrupted storage data gracefully", () => {
			mockSessionStorage.SQ_PROMPT_CACHE = "not valid json";

			const value = getFromSessionCache("test-key");
			expect(value).toBeUndefined();
		});

		it("should handle storage errors gracefully", () => {
			vi.stubGlobal("sessionStorage", {
				getItem: vi.fn(() => {
					throw new Error("SecurityError");
				}),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			});

			const value = getFromSessionCache("test-key");
			expect(value).toBeUndefined();
		});

		it("should do nothing in server-side environment", () => {
			vi.stubGlobal("window", undefined);

			const value = getFromSessionCache("test-key");
			expect(value).toBeUndefined();
		});
	});

	describe("clearSessionCache", () => {
		it("should remove cache from session storage", () => {
			saveToSessionCache("test-key", "test-value");
			expect(mockSessionStorage.SQ_PROMPT_CACHE).toBeDefined();

			clearSessionCache();

			expect(mockSessionStorage.SQ_PROMPT_CACHE).toBeUndefined();
		});

		it("should handle removal errors gracefully", () => {
			vi.stubGlobal("sessionStorage", {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(() => {
					throw new Error("SecurityError");
				}),
			});

			// Should not throw
			expect(() => {
				clearSessionCache();
			}).not.toThrow();
		});

		it("should do nothing in server-side environment", () => {
			vi.stubGlobal("window", undefined);

			// Should not throw
			expect(() => {
				clearSessionCache();
			}).not.toThrow();
		});
	});
});

describe("createPromptCacheKey edge cases", () => {
	it("should handle nested objects in options", () => {
		const key1 = createPromptCacheKey("test", "general", {
			nested: { a: 1, b: { c: 2 } },
		});
		const key2 = createPromptCacheKey("test", "general", {
			nested: { b: { c: 2 }, a: 1 },
		});
		expect(key1).toBe(key2);
	});

	it("should handle arrays in options", () => {
		const key1 = createPromptCacheKey("test", "general", {
			items: [1, 2, 3],
		});
		const key2 = createPromptCacheKey("test", "general", {
			items: [1, 2, 3],
		});
		expect(key1).toBe(key2);
	});

	it("should handle null values in options", () => {
		const key = createPromptCacheKey("test", "general", {
			nullValue: null,
		});
		expect(typeof key).toBe("string");
	});
});

describe("LRUCache edge cases", () => {
	it("should handle delete on non-existent key", () => {
		const cache = new LRUCache<string, string>({
			maxEntries: 10,
			ttlMs: 0,
		});
		const result = cache.delete("non-existent");
		expect(result).toBe(false);
	});

	it("should handle empty cache correctly", () => {
		const cache = new LRUCache<string, string>({
			maxEntries: 10,
			ttlMs: 0,
		});
		expect(cache.size).toBe(0);
		expect(cache.get("any")).toBeUndefined();
		expect(cache.has("any")).toBe(false);
	});

	it("should evict multiple items when significantly over capacity", () => {
		const cache = new LRUCache<string, string>({
			maxEntries: 2,
			ttlMs: 0,
		});

		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.set("key3", "value3"); // Evicts key1
		cache.set("key4", "value4"); // Evicts key2

		expect(cache.size).toBe(2);
		expect(cache.get("key1")).toBeUndefined();
		expect(cache.get("key2")).toBeUndefined();
		expect(cache.get("key3")).toBe("value3");
		expect(cache.get("key4")).toBe("value4");
	});
});
