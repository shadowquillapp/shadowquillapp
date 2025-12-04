(() => {
	try {
		let savedTheme = localStorage.getItem("theme-preference");
		// Migrate old 'default' theme to 'purpledark'
		if (savedTheme === "default") {
			savedTheme = "purpledark";
			localStorage.setItem("theme-preference", "purpledark");
		}
		// Default to earth theme if no saved preference or invalid
		if (
			savedTheme &&
			(savedTheme === "earth" ||
				savedTheme === "purpledark" ||
				savedTheme === "dark" ||
				savedTheme === "light")
		) {
			document.documentElement.setAttribute(
				"data-theme",
				savedTheme === "earth" ? "" : savedTheme,
			);
		} else {
			// No saved preference - use earth as default
			document.documentElement.setAttribute("data-theme", "");
		}
	} catch (_e) {
		// Fallback to earth theme on error
		document.documentElement.setAttribute("data-theme", "");
	}
})();
