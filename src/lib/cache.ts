/**
 * Multi-level caching system for prompt generation
 * Provides LRU (Least Recently Used) caching with configurable TTL
 */

// ============================================
// Types
// ============================================

export interface CacheOptions {
	/** Maximum number of entries in the cache */
	maxEntries: number;
	/** Time-to-live in milliseconds (0 = no expiration) */
	ttlMs: number;
}

interface CacheEntry<T> {
	value: T;
	timestamp: number;
	accessCount: number;
}

// ============================================
// LRU Cache Implementation
// ============================================

/**
 * Generic LRU (Least Recently Used) cache with TTL support
 * Thread-safe for single-threaded JavaScript execution
 */
export class LRUCache<K, V> {
	private cache: Map<K, CacheEntry<V>>;
	private readonly maxEntries: number;
	private readonly ttlMs: number;

	constructor(options: CacheOptions) {
		this.cache = new Map();
		this.maxEntries = options.maxEntries;
		this.ttlMs = options.ttlMs;
	}

	/**
	 * Get a value from the cache
	 * Returns undefined if not found or expired
	 */
	get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;

		// Check TTL
		if (this.ttlMs > 0 && Date.now() - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return undefined;
		}

		// Update access count and move to end (most recently used)
		entry.accessCount++;
		this.cache.delete(key);
		this.cache.set(key, entry);

		return entry.value;
	}

	/**
	 * Set a value in the cache
	 * Evicts LRU entries if cache is full
	 */
	set(key: K, value: V): void {
		// Delete existing entry to update position
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}

		// Evict LRU entries if at capacity
		while (this.cache.size >= this.maxEntries) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			} else {
				break;
			}
		}

		// Add new entry
		this.cache.set(key, {
			value,
			timestamp: Date.now(),
			accessCount: 1,
		});
	}

	/**
	 * Check if a key exists and is not expired
	 */
	has(key: K): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;

		if (this.ttlMs > 0 && Date.now() - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Delete a specific key from the cache
	 */
	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all entries from the cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get the current size of the cache
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; maxEntries: number; ttlMs: number } {
		return {
			size: this.cache.size,
			maxEntries: this.maxEntries,
			ttlMs: this.ttlMs,
		};
	}

	/**
	 * Remove expired entries from the cache
	 */
	prune(): number {
		if (this.ttlMs <= 0) return 0;

		const now = Date.now();
		let pruned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.ttlMs) {
				this.cache.delete(key);
				pruned++;
			}
		}

		return pruned;
	}
}

// ============================================
// Hash Utilities
// ============================================

/**
 * Simple string hash function for cache keys
 * Uses djb2 algorithm for good distribution
 */
export function hashString(str: string): string {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
}

/**
 * Create a cache key from prompt generation parameters
 */
export function createPromptCacheKey(
	input: string,
	taskType: string,
	options?: Record<string, unknown>,
): string {
	const optionsStr = options ? JSON.stringify(sortObjectKeys(options)) : "";
	return hashString(`${taskType}:${input}:${optionsStr}`);
}

/**
 * Sort object keys for consistent hashing
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		const value = obj[key];
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			sorted[key] = sortObjectKeys(value as Record<string, unknown>);
		} else {
			sorted[key] = value;
		}
	}
	return sorted;
}

// ============================================
// Prompt Cache Singleton
// ============================================

/** Cache for generated prompts - 100 entries, 10 minute TTL */
const PROMPT_CACHE_OPTIONS: CacheOptions = {
	maxEntries: 100,
	ttlMs: 10 * 60 * 1000, // 10 minutes
};

/** Cache for template lookups - 50 entries, 30 minute TTL */
const TEMPLATE_CACHE_OPTIONS: CacheOptions = {
	maxEntries: 50,
	ttlMs: 30 * 60 * 1000, // 30 minutes
};

// Singleton instances
let promptCache: LRUCache<string, string> | null = null;
let templateCache: LRUCache<string, unknown> | null = null;

/**
 * Get the prompt cache singleton
 */
export function getPromptCache(): LRUCache<string, string> {
	if (!promptCache) {
		promptCache = new LRUCache<string, string>(PROMPT_CACHE_OPTIONS);
	}
	return promptCache;
}

/**
 * Get the template cache singleton
 */
export function getTemplateCache(): LRUCache<string, unknown> {
	if (!templateCache) {
		templateCache = new LRUCache<string, unknown>(TEMPLATE_CACHE_OPTIONS);
	}
	return templateCache;
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
	promptCache?.clear();
	templateCache?.clear();
}

// ============================================
// Session Storage Cache (for persistence across page reloads)
// ============================================

const SESSION_CACHE_KEY = "SQ_PROMPT_CACHE";
const SESSION_CACHE_MAX_SIZE = 20;

interface SessionCacheData {
	entries: Array<{ key: string; value: string; timestamp: number }>;
}

/**
 * Save a prompt to session storage for persistence
 */
export function saveToSessionCache(key: string, value: string): void {
	if (typeof window === "undefined") return;

	try {
		const data = getSessionCacheData();
		
		// Remove existing entry with same key
		data.entries = data.entries.filter((e) => e.key !== key);
		
		// Add new entry
		data.entries.push({ key, value, timestamp: Date.now() });
		
		// Trim to max size (keep most recent)
		if (data.entries.length > SESSION_CACHE_MAX_SIZE) {
			data.entries = data.entries.slice(-SESSION_CACHE_MAX_SIZE);
		}
		
		sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
	} catch {
		// Ignore storage errors
	}
}

/**
 * Get a prompt from session storage
 */
export function getFromSessionCache(key: string): string | undefined {
	if (typeof window === "undefined") return undefined;

	try {
		const data = getSessionCacheData();
		const entry = data.entries.find((e) => e.key === key);
		return entry?.value;
	} catch {
		return undefined;
	}
}

/**
 * Get session cache data
 */
function getSessionCacheData(): SessionCacheData {
	try {
		const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
		if (!raw) return { entries: [] };
		return JSON.parse(raw) as SessionCacheData;
	} catch {
		return { entries: [] };
	}
}

/**
 * Clear session cache
 */
export function clearSessionCache(): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.removeItem(SESSION_CACHE_KEY);
	} catch {
		// Ignore
	}
}

