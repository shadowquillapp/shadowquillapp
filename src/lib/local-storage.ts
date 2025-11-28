// Global flag to prevent saves during factory reset
let _factoryResetInProgress = false;

export function isFactoryResetInProgress(): boolean {
	return _factoryResetInProgress;
}

export function getJSON<T>(key: string, defaultValue: T): T {
	try {
		const raw =
			typeof window !== "undefined" ? localStorage.getItem(key) : null;
		if (!raw) return defaultValue;
		return JSON.parse(raw) as T;
	} catch {
		return defaultValue;
	}
}

export function setJSON<T>(key: string, value: T): void {
	// Block all writes during factory reset
	if (_factoryResetInProgress) return;
	try {
		if (typeof window !== "undefined") {
			localStorage.setItem(key, JSON.stringify(value));
		}
	} catch {
		// ignore
	}
}

export function remove(key: string): void {
	try {
		if (typeof window !== "undefined") {
			localStorage.removeItem(key);
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

	// Set flag to block any further writes
	_factoryResetInProgress = true;

	// All known localStorage keys used by the app
	const localStorageKeys = [
		"workbench-tabs-v1",      // Tab manager
		"PC_PRESETS",             // Presets
		"PC_PROJECTS",            // Projects
		"PC_TEST_MESSAGES",       // Test messages
		"theme-preference",       // Theme
		"recent-presets",         // Recent presets
		"last-selected-preset",   // Last selected preset
		"SYSTEM_PROMPT_BUILD",    // System prompt build
	];

	// Clear known keys first
	for (const key of localStorageKeys) {
		try {
			localStorage.removeItem(key);
		} catch {
			// ignore
		}
	}

	// Also clear entire localStorage to catch any keys we might have missed
	try {
		localStorage.clear();
	} catch {
		// ignore
	}

	// Clear sessionStorage
	try {
		sessionStorage.clear();
	} catch {
		// ignore
	}

	console.log("[Factory Reset] All renderer storage cleared");
}
