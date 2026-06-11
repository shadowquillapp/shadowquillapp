import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyThemeToDocument } from "@/lib/theme-preference";

describe("applyThemeToDocument", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		document.documentElement.removeAttribute("data-theme");
		document.documentElement.classList.remove("theme-transitioning");
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("sets the data-theme attribute for a named theme", () => {
		applyThemeToDocument("dark");
		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
	});

	it("maps earth to an empty data-theme attribute", () => {
		applyThemeToDocument("dark");
		vi.runOnlyPendingTimers();
		applyThemeToDocument("earth");
		expect(document.documentElement.getAttribute("data-theme")).toBe("");
	});

	it("adds the transition class and removes it after the fade", () => {
		applyThemeToDocument("light");
		expect(
			document.documentElement.classList.contains("theme-transitioning"),
		).toBe(true);
		vi.advanceTimersByTime(300);
		expect(
			document.documentElement.classList.contains("theme-transitioning"),
		).toBe(false);
	});

	it("does not start a transition when the theme is unchanged", () => {
		applyThemeToDocument("dark");
		vi.runOnlyPendingTimers();
		applyThemeToDocument("dark");
		expect(
			document.documentElement.classList.contains("theme-transitioning"),
		).toBe(false);
	});

	it("debounces rapid switches into a single trailing cleanup", () => {
		applyThemeToDocument("dark");
		vi.advanceTimersByTime(150);
		applyThemeToDocument("light");
		vi.advanceTimersByTime(150);
		// First timer would have fired by now; class must still be present
		// because the second switch reset it.
		expect(
			document.documentElement.classList.contains("theme-transitioning"),
		).toBe(true);
		vi.advanceTimersByTime(150);
		expect(
			document.documentElement.classList.contains("theme-transitioning"),
		).toBe(false);
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
	});
});
