export function getJSON<T>(key: string, defaultValue: T): T {
	try {
		const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
		if (!raw) return defaultValue;
		return JSON.parse(raw) as T;
	} catch {
		return defaultValue;
	}
}

export function setJSON<T>(key: string, value: T): void {
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
