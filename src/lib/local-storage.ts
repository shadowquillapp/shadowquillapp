import { storage } from "./electron-storage";
import { ALL_LOCAL_KEYS, ALL_SESSION_KEYS } from "./storage-keys";

let _factoryResetInProgress = false;

export function isFactoryResetInProgress(): boolean {
	return _factoryResetInProgress;
}

export function abortFactoryReset(): void {
	_factoryResetInProgress = false;
}

function canUseStorage(): boolean {
	return typeof window !== "undefined";
}

export function getRaw(key: string): string | null {
	try {
		return canUseStorage() ? storage.getItem(key) : null;
	} catch {
		return null;
	}
}

export function getJSON<T>(key: string, defaultValue: T): T;
export function getJSON<T>(key: string, defaultValue: T | null): T | null;
export function getJSON<T>(key: string, defaultValue: T | null): T | null {
	try {
		const raw = getRaw(key);
		if (raw == null) return defaultValue;
		return JSON.parse(raw) as T;
	} catch {
		return defaultValue;
	}
}

export function setJSON<T>(key: string, value: T): void {
	if (_factoryResetInProgress) return;
	try {
		if (canUseStorage()) {
			storage.setItem(key, JSON.stringify(value));
		}
	} catch {
		// ignore
	}
}

export function remove(key: string): void {
	try {
		if (canUseStorage()) {
			storage.removeItem(key);
		}
	} catch {
		// ignore
	}
}

export function clearAllStorageForFactoryReset(): void {
	if (!canUseStorage()) return;

	_factoryResetInProgress = true;

	for (const key of ALL_LOCAL_KEYS) {
		try {
			storage.removeItem(key);
		} catch {
			// ignore
		}
	}

	for (const key of ALL_SESSION_KEYS) {
		try {
			sessionStorage.removeItem(key);
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
