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

const THEME_TRANSITION_CLASS = "theme-transitioning";
const THEME_TRANSITION_MS = 300;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

export function applyThemeToDocument(theme: ThemeId): void {
	const root = document.documentElement;
	const next = theme === "earth" ? "" : theme;
	if (root.getAttribute("data-theme") === next) return;

	root.classList.add(THEME_TRANSITION_CLASS);
	root.setAttribute("data-theme", next);

	if (transitionTimer !== null) clearTimeout(transitionTimer);
	transitionTimer = setTimeout(() => {
		root.classList.remove(THEME_TRANSITION_CLASS);
		transitionTimer = null;
	}, THEME_TRANSITION_MS);
}

export function applyStoredThemeToDocument(): void {
	applyThemeToDocument(readThemePreference());
}

export function persistTheme(theme: ThemeId): void {
	setJSON(STORAGE_KEYS.THEME_PREFERENCE.key, theme);
}
