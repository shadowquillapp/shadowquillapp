interface ShadowQuillStorage {
	storage?: {
		getItem: (key: string) => Promise<string | null>;
		setItem: (key: string, value: string) => Promise<boolean>;
		removeItem: (key: string) => Promise<boolean>;
		clear: () => Promise<boolean>;
		getAll: () => Promise<Record<string, string>>;
	};
}

type WindowWithShadowQuill = Window & {
	shadowquill?: ShadowQuillStorage & Record<string, unknown>;
};

function isElectronStorageAvailable(): boolean {
	if (typeof window === "undefined") return false;
	const win = window as WindowWithShadowQuill;
	return !!win.shadowquill?.storage;
}

class ElectronStorage {
	cache: Map<string, string> = new Map();
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	async init() {
		if (this.initialized) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			if (isElectronStorageAvailable()) {
				try {
					const win = window as WindowWithShadowQuill;
					const allData = await win.shadowquill?.storage?.getAll();
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

	async getItem(key: string): Promise<string | null> {
		await this.init();

		if (isElectronStorageAvailable()) {
			try {
				const win = window as WindowWithShadowQuill;
				const value = await win.shadowquill?.storage?.getItem(key);
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

		if (isElectronStorageAvailable()) {
			try {
				const win = window as WindowWithShadowQuill;
				await win.shadowquill?.storage?.setItem(key, value);
				return;
			} catch (e) {
				console.error("[ElectronStorage] setItem failed:", e);
			}
		}

		try {
			localStorage.setItem(key, value);
		} catch (e) {
			console.error("[ElectronStorage] localStorage fallback failed:", e);
		}
	}

	async removeItem(key: string): Promise<void> {
		await this.init();

		this.cache.delete(key);

		if (isElectronStorageAvailable()) {
			try {
				const win = window as WindowWithShadowQuill;
				await win.shadowquill?.storage?.removeItem(key);
				return;
			} catch (e) {
				console.error("[ElectronStorage] removeItem failed:", e);
			}
		}

		try {
			localStorage.removeItem(key);
		} catch (e) {
			console.error("[ElectronStorage] localStorage fallback failed:", e);
		}
	}

	async clear(): Promise<void> {
		await this.init();

		this.cache.clear();

		if (isElectronStorageAvailable()) {
			try {
				const win = window as WindowWithShadowQuill;
				await win.shadowquill?.storage?.clear();
				return;
			} catch (e) {
				console.error("[ElectronStorage] clear failed:", e);
			}
		}

		try {
			localStorage.clear();
		} catch (e) {
			console.error("[ElectronStorage] localStorage fallback failed:", e);
		}
	}

	getItemSync(key: string): string | null {
		return this.cache.get(key) ?? null;
	}
}

const electronStorage = new ElectronStorage();

export const storage = {
	getItem: (key: string): string | null => {
		if (!isElectronStorageAvailable()) {
			try {
				return localStorage.getItem(key);
			} catch {
				return null;
			}
		}

		const cached = electronStorage.getItemSync(key);
		if (cached !== null) return cached;

		try {
			const localValue = localStorage.getItem(key);
			if (localValue !== null) {
				electronStorage.cache.set(key, localValue);
				return localValue;
			}
		} catch {
			// ignore
		}

		void electronStorage.getItem(key);
		return null;
	},

	setItem: (key: string, value: string): void => {
		if (!isElectronStorageAvailable()) {
			try {
				localStorage.setItem(key, value);
				return;
			} catch {
				return;
			}
		}

		electronStorage.cache.set(key, value);

		try {
			localStorage.setItem(key, value);
		} catch {
			// ignore
		}

		void electronStorage.setItem(key, value);
	},

	removeItem: (key: string): void => {
		if (!isElectronStorageAvailable()) {
			try {
				localStorage.removeItem(key);
				return;
			} catch {
				return;
			}
		}

		electronStorage.cache.delete(key);

		try {
			localStorage.removeItem(key);
		} catch {
			// ignore
		}

		void electronStorage.removeItem(key);
	},

	clear: (): void => {
		if (!isElectronStorageAvailable()) {
			try {
				localStorage.clear();
				return;
			} catch {
				return;
			}
		}

		electronStorage.cache.clear();

		try {
			localStorage.clear();
		} catch {
			// ignore
		}

		void electronStorage.clear();
	},
};

export const storageAsync = {
	getItem: (key: string): Promise<string | null> => {
		return electronStorage.getItem(key);
	},

	setItem: (key: string, value: string): Promise<void> => {
		return electronStorage.setItem(key, value);
	},

	removeItem: (key: string): Promise<void> => {
		return electronStorage.removeItem(key);
	},

	clear: (): Promise<void> => {
		return electronStorage.clear();
	},
};

if (typeof window !== "undefined") {
	void electronStorage.init();
}
