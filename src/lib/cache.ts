import { STORAGE_KEYS } from "./storage-keys";

export interface CacheOptions {
	maxEntries: number;
	ttlMs: number;
}

interface CacheEntry<T> {
	value: T;
	timestamp: number;
}

export class LRUCache<K, V> {
	private cache: Map<K, CacheEntry<V>>;
	private readonly maxEntries: number;
	private readonly ttlMs: number;

	constructor(options: CacheOptions) {
		this.cache = new Map();
		this.maxEntries = options.maxEntries;
		this.ttlMs = options.ttlMs;
	}

	get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;

		if (this.ttlMs > 0 && Date.now() - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return undefined;
		}

		this.cache.delete(key);
		this.cache.set(key, entry);

		return entry.value;
	}

	set(key: K, value: V): void {
		this.cache.delete(key);

		while (this.cache.size >= this.maxEntries) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			} else {
				break;
			}
		}

		this.cache.set(key, {
			value,
			timestamp: Date.now(),
		});
	}

	has(key: K): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;

		if (this.ttlMs > 0 && Date.now() - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}

	getStats(): { size: number; maxEntries: number; ttlMs: number } {
		return {
			size: this.cache.size,
			maxEntries: this.maxEntries,
			ttlMs: this.ttlMs,
		};
	}

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

export function hashString(str: string): string {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
}

export function createPromptCacheKey(
	input: string,
	taskType: string,
	options?: Record<string, unknown>,
): string {
	const optionsStr = options ? JSON.stringify(sortObjectKeys(options)) : "";
	return hashString(`${taskType}:${input}:${optionsStr}`);
}

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

const PROMPT_CACHE_OPTIONS: CacheOptions = {
	maxEntries: 100,
	ttlMs: 10 * 60 * 1000, // 10 minutes
};

const TEMPLATE_CACHE_OPTIONS: CacheOptions = {
	maxEntries: 50,
	ttlMs: 30 * 60 * 1000, // 30 minutes
};

let promptCache: LRUCache<string, string> | null = null;
let templateCache: LRUCache<string, unknown> | null = null;

export function getPromptCache(): LRUCache<string, string> {
	promptCache ??= new LRUCache<string, string>(PROMPT_CACHE_OPTIONS);
	return promptCache;
}

export function getTemplateCache(): LRUCache<string, unknown> {
	templateCache ??= new LRUCache<string, unknown>(TEMPLATE_CACHE_OPTIONS);
	return templateCache;
}

export function clearAllCaches(): void {
	promptCache?.clear();
	templateCache?.clear();
}

const SESSION_CACHE_KEY = STORAGE_KEYS.PROMPT_CACHE.key;
const SESSION_CACHE_MAX_SIZE = 20;

interface SessionCacheData {
	entries: Array<{ key: string; value: string; timestamp: number }>;
}

export function saveToSessionCache(key: string, value: string): void {
	if (typeof window === "undefined") return;

	try {
		const data = getSessionCacheData();

		data.entries = data.entries.filter((e) => e.key !== key);
		data.entries.push({ key, value, timestamp: Date.now() });

		if (data.entries.length > SESSION_CACHE_MAX_SIZE) {
			data.entries = data.entries.slice(-SESSION_CACHE_MAX_SIZE);
		}

		sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
	} catch {}
}

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

function getSessionCacheData(): SessionCacheData {
	try {
		const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
		if (!raw) return { entries: [] };
		return JSON.parse(raw) as SessionCacheData;
	} catch {
		return { entries: [] };
	}
}

export function clearSessionCache(): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.removeItem(SESSION_CACHE_KEY);
	} catch {}
}
