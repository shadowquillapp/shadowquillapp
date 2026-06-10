export interface ElectronDataPaths {
	userData?: string;
	localStorageDir?: string;
	localStorageLevelDb?: string;
}

export type ElectronDataPathsResult =
	| { ok: true; paths: ElectronDataPaths }
	| { ok: false; error: string };

interface ElectronDataPathsResponse {
	ok: boolean;
	error?: string;
	userData?: string;
	localStorageDir?: string;
	localStorageLevelDb?: string;
}

export async function getElectronDataPaths(): Promise<ElectronDataPathsResult> {
	const api = window.shadowquill;
	if (!api?.getDataPaths) {
		return { ok: false, error: "Not available outside the desktop app" };
	}
	try {
		const res = await (api.getDataPaths() as Promise<
			ElectronDataPathsResponse | undefined
		>);
		if (res?.ok) {
			return {
				ok: true,
				paths: {
					...(res.userData && { userData: res.userData }),
					...(res.localStorageDir && {
						localStorageDir: res.localStorageDir,
					}),
					...(res.localStorageLevelDb && {
						localStorageLevelDb: res.localStorageLevelDb,
					}),
				},
			};
		}
		return { ok: false, error: res?.error || "Failed to load data paths" };
	} catch (e: unknown) {
		const err = e as Error;
		const msg = String(err?.message || "");
		if (msg.includes("No handler registered")) {
			return {
				ok: false,
				error:
					"Main process not updated yet. Please fully quit and relaunch the app.",
			};
		}
		return { ok: false, error: err?.message || "Failed to load data paths" };
	}
}

function isElectronStorageAvailable(): boolean {
	return typeof window !== "undefined" && !!window.shadowquill?.storage;
}

class ElectronStorage {
	private cache: Map<string, string> = new Map();
	private initialized = false;
	private initPromise: Promise<void> | null = null;
	private writeQueue = Promise.resolve();

	async init() {
		if (this.initialized) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			if (isElectronStorageAvailable()) {
				try {
					const allData = await window.shadowquill?.storage?.getAll();
					if (allData) {
						this.cache = new Map(Object.entries(allData));
					}
				} catch (e) {
					console.error("[ElectronStorage] Failed to initialize:", e);
				}
			}
			this.initialized = true;
		})();

		return this.initPromise;
	}

	getCached(key: string): string | null {
		return this.cache.get(key) ?? null;
	}

	setCached(key: string, value: string): void {
		this.cache.set(key, value);
	}

	deleteCached(key: string): void {
		this.cache.delete(key);
	}

	clearCached(): void {
		this.cache.clear();
	}

	private enqueueWrite(write: () => Promise<void>): Promise<void> {
		this.writeQueue = this.writeQueue.then(write, write);
		return this.writeQueue;
	}

	private enqueueIpcWrite(
		label: string,
		ipc: () => Promise<unknown> | undefined,
		local: () => void,
	): Promise<void> {
		return this.enqueueWrite(async () => {
			if (isElectronStorageAvailable()) {
				try {
					await ipc();
					return;
				} catch (e) {
					console.error(`[ElectronStorage] ${label} failed:`, e);
				}
			}
			try {
				local();
			} catch (e) {
				console.error("[ElectronStorage] localStorage fallback failed:", e);
			}
		});
	}

	async getItem(key: string): Promise<string | null> {
		await this.init();

		if (isElectronStorageAvailable()) {
			try {
				const value = await window.shadowquill?.storage?.getItem(key);
				if (value !== null && value !== undefined) {
					this.cache.set(key, value);
				} else {
					this.cache.delete(key);
				}
				return value ?? null;
			} catch (e) {
				console.error("[ElectronStorage] getItem failed:", e);
				return this.cache.get(key) ?? null;
			}
		}

		try {
			return localStorage.getItem(key);
		} catch (e) {
			console.error("[ElectronStorage] localStorage fallback failed:", e);
			return null;
		}
	}

	async setItem(key: string, value: string): Promise<void> {
		await this.init();
		this.cache.set(key, value);
		await this.enqueueIpcWrite(
			"setItem",
			() => window.shadowquill?.storage?.setItem(key, value),
			() => localStorage.setItem(key, value),
		);
	}

	async removeItem(key: string): Promise<void> {
		await this.init();
		this.cache.delete(key);
		await this.enqueueIpcWrite(
			"removeItem",
			() => window.shadowquill?.storage?.removeItem(key),
			() => localStorage.removeItem(key),
		);
	}

	async clear(): Promise<void> {
		await this.init();
		this.cache.clear();
		await this.enqueueIpcWrite(
			"clear",
			() => window.shadowquill?.storage?.clear(),
			() => localStorage.clear(),
		);
	}
}

const electronStorage = new ElectronStorage();

function syncWrite(
	local: () => void,
	cached: () => void,
	queued: () => Promise<void>,
): void {
	if (!isElectronStorageAvailable()) {
		try {
			local();
		} catch {}
		return;
	}
	cached();
	try {
		local();
	} catch {}
	void queued();
}

export const storage = {
	getItem: (key: string): string | null => {
		if (!isElectronStorageAvailable()) {
			try {
				return localStorage.getItem(key);
			} catch {
				return null;
			}
		}

		const cached = electronStorage.getCached(key);
		if (cached !== null) return cached;

		try {
			const localValue = localStorage.getItem(key);
			if (localValue !== null) {
				electronStorage.setCached(key, localValue);
				return localValue;
			}
		} catch {}

		void electronStorage.getItem(key);
		return null;
	},

	setItem: (key: string, value: string): void =>
		syncWrite(
			() => localStorage.setItem(key, value),
			() => electronStorage.setCached(key, value),
			() => electronStorage.setItem(key, value),
		),

	removeItem: (key: string): void =>
		syncWrite(
			() => localStorage.removeItem(key),
			() => electronStorage.deleteCached(key),
			() => electronStorage.removeItem(key),
		),

	clear: (): void =>
		syncWrite(
			() => localStorage.clear(),
			() => electronStorage.clearCached(),
			() => electronStorage.clear(),
		),
};

if (typeof window !== "undefined") {
	void electronStorage.init();
}
