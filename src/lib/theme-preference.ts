import { getJSON, setJSON } from "./local-storage";
import { STORAGE_KEYS } from "./storage-keys";

export type ThemeId = "earth" | "purpledark" | "dark" | "light";

export function readThemePreference(): ThemeId {
	let saved = getJSON<ThemeId | "default" | null>(
		STORAGE_KEYS.THEME_PREFERENCE.key,
		null,
	);
	if (saved === "default") {
		saved = "purpledark";
		setJSON(STORAGE_KEYS.THEME_PREFERENCE.key, "purpledark");
	}
	if (
		saved === "earth" ||
		saved === "purpledark" ||
		saved === "dark" ||
		saved === "light"
	) {
		return saved;
	}
	return "earth";
}

export function applyThemeToDocument(theme: ThemeId): void {
	document.documentElement.setAttribute(
		"data-theme",
		theme === "earth" ? "" : theme,
	);
}

export function applyStoredThemeToDocument(): void {
	applyThemeToDocument(readThemePreference());
}

export function persistTheme(theme: ThemeId): void {
	setJSON(STORAGE_KEYS.THEME_PREFERENCE.key, theme);
}
