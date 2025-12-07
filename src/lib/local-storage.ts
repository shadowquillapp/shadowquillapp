import { storage } from "./electron-storage";

let _factoryResetInProgress = false;

export function isFactoryResetInProgress(): boolean {
	return _factoryResetInProgress;
}

export function getJSON<T>(key: string, defaultValue: T): T;
export function getJSON<T>(key: string, defaultValue: T | null): T | null;
export function getJSON<T>(key: string, defaultValue: T | null): T | null {
	try {
		if (typeof window === "undefined") return defaultValue;

		const raw = storage.getItem(key);
		if (!raw) return defaultValue;
		return JSON.parse(raw) as T;
	} catch {
		return defaultValue;
	}
}

export function setJSON<T>(key: string, value: T): void {
	if (_factoryResetInProgress) return;
	try {
		if (typeof window !== "undefined") {
			storage.setItem(key, JSON.stringify(value));
		}
	} catch {
		// ignore
	}
}

export function remove(key: string): void {
	try {
		if (typeof window !== "undefined") {
			storage.removeItem(key);
		}
	} catch {
		// ignore
	}
}

/**
 * Clears ALL application data from localStorage and sessionStorage.
 * Sets a flag to prevent any further writes during factory reset.
 * Must be called BEFORE the main process factory reset to prevent race conditions.
 */
export function clearAllStorageForFactoryReset(): void {
	if (typeof window === "undefined") return;

	_factoryResetInProgress = true;

	const localStorageKeys = [
		"workbench-tabs-v1",
		"PC_PRESETS",
		"PC_PROJECTS",
		"PC_TEST_MESSAGES",
		"theme-preference",
		"recent-presets",
		"last-selected-preset",
		"SYSTEM_PROMPT_BUILD",
	];

	for (const key of localStorageKeys) {
		try {
			storage.removeItem(key);
		} catch {
			// ignore
		}
	}

	try {
		storage.clear();
	} catch {
		// ignore
	}

	try {
		sessionStorage.clear();
	} catch {
		// ignore
	}

	console.log("[Factory Reset] All renderer storage cleared");
}
