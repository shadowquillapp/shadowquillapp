const path = require("node:path");
const { BrowserWindow, shell, Menu } = require("electron");
const { openExternalUrl } = require("./external-url.cjs");
const { addAllowedAppOrigin, isAllowedAppUrl } = require("./ipc-security.cjs");
const { loadWindowState, saveWindowState } = require("./window-state.cjs");

function setZoom(win, factor) {
	win.webContents.setZoomFactor(factor);
	win.webContents.send("shadowquill:zoom:changed", factor);
}

function createWindow(isDev) {
	const windowState = loadWindowState();

	const win = new BrowserWindow({
		width: windowState.width,
		height: windowState.height,
		x: windowState.x,
		y: windowState.y,
		minWidth: 1045,
		minHeight: 850,
		...(process.platform === "darwin" || process.platform === "win32"
			? { frame: false }
			: {}),
		webPreferences: {
			devTools: isDev,
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "..", "preload.cjs"),
			spellcheck: true,
			partition: "persist:main",
		},
		title: "",
	});

	if (windowState.isMaximized) win.maximize();

	win._lastNormalBounds = win.getBounds();

	win.on("will-resize", (event, newBounds) => {
		if (newBounds.width < 1045 || newBounds.height < 850) {
			event.preventDefault();
		}
	});

	let saveStateTimeout = null;
	const debouncedSaveState = () => {
		if (saveStateTimeout) clearTimeout(saveStateTimeout);
		saveStateTimeout = setTimeout(() => {
			if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) {
				win._lastNormalBounds = win.getBounds();
			}
			saveWindowState(win);
		}, 500);
	};

	win.on("resize", debouncedSaveState);
	win.on("move", debouncedSaveState);
	win.on("maximize", debouncedSaveState);
	win.on("unmaximize", () => {
		win._lastNormalBounds = win.getBounds();
		debouncedSaveState();
	});

	win.on("close", () => {
		if (saveStateTimeout) clearTimeout(saveStateTimeout);
		saveWindowState(win);
		try {
			win.webContents.session.flushStorageData();
			console.log("[Window] Storage flushed on close");
		} catch (e) {
			console.error("[Window] Failed to flush storage on close:", e);
		}
	});

	win.webContents.once("did-finish-load", () => {
		win.webContents.setZoomFactor(1.0);

		// Suppress noisy Chromium Autofill devtools errors in the renderer console.
		win.webContents.executeJavaScript(`
      (function() {
        const originalError = console.error;
        console.error = function(...args) {
          const message = args.join(' ');
          if (message.includes("Request Autofill.enable failed") || 
              message.includes("Request Autofill.setAddresses failed")) {
            return;
          }
          originalError.apply(console, args);
        };
      })();
    `);

		const flushInterval = setInterval(() => {
			try {
				win.webContents.session.flushStorageData();
			} catch (e) {
				console.warn("[Window] Periodic storage flush failed:", e);
			}
		}, 30000);

		win.once("closed", () => clearInterval(flushInterval));
	});

	try {
		win.webContents.session.setSpellCheckerLanguages(["en-US"]);
	} catch (_e) {}

	win.webContents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown" || !(input.control || input.meta)) return;
		const current = win.webContents.getZoomFactor();
		if (
			input.key === "+" ||
			input.key === "=" ||
			input.key === "Add" ||
			(input.shift && input.key === "=")
		) {
			event.preventDefault();
			setZoom(win, Math.min(1.5, current + 0.1));
		} else if (input.key === "-" || input.key === "Subtract") {
			event.preventDefault();
			setZoom(win, Math.max(0.8, current - 0.1));
		} else if (input.key === "0") {
			event.preventDefault();
			setZoom(win, 1.0);
		}
	});

	win.webContents.on("found-in-page", (_event, result) => {
		try {
			win.webContents.executeJavaScript(`
				window.dispatchEvent(new CustomEvent('found-in-page', { 
					detail: { 
						activeMatchOrdinal: ${result.activeMatchOrdinal}, 
						matches: ${result.matches} 
					} 
				}));
			`);
		} catch (_) {}
	});

	let spellcheckEnabled = true;

	win.webContents.on("context-menu", (_event, params) => {
		/** @type {import('electron').MenuItemConstructorOptions[]} */
		const template = [];
		const swallow = (fn) => () => {
			try {
				fn();
			} catch (_) {}
		};

		if (params.misspelledWord) {
			const suggestions = (params.dictionarySuggestions || []).slice(0, 6);
			if (suggestions.length) {
				for (const s of suggestions) {
					template.push({
						label: s,
						click: swallow(() => win.webContents.replaceMisspelling(s)),
					});
				}
			} else {
				template.push({ label: "No Suggestions", enabled: false });
			}
			template.push(
				{ type: "separator" },
				{
					label: `Add to Dictionary: "${params.misspelledWord}"`,
					click: swallow(() =>
						win.webContents.session.addWordToSpellCheckerDictionary(
							params.misspelledWord,
						),
					),
				},
				{ type: "separator" },
			);
		}

		template.push(
			{ label: "Undo", role: "undo", enabled: params.editFlags.canUndo },
			{ label: "Redo", role: "redo", enabled: params.editFlags.canRedo },
			{ type: "separator" },
			{ label: "Cut", role: "cut", enabled: params.editFlags.canCut },
			{ label: "Copy", role: "copy", enabled: params.editFlags.canCopy },
			{ label: "Paste", role: "paste", enabled: params.editFlags.canPaste },
			{ type: "separator" },
			{
				label: "Select All",
				role: "selectAll",
				enabled: params.editFlags.canSelectAll,
			},
			{ type: "separator" },
			{
				label: "Spelling",
				submenu: [
					{
						label: "Check Spelling While Typing",
						type: "checkbox",
						checked: spellcheckEnabled,
						click: () => {
							spellcheckEnabled = !spellcheckEnabled;
							swallow(() =>
								win.webContents.session.setSpellCheckerLanguages(
									spellcheckEnabled ? ["en-US"] : [],
								),
							)();
						},
					},
				],
			},
		);

		if (isDev) {
			template.push(
				{ type: "separator" },
				{
					label: "Inspect Element",
					click: swallow(() =>
						win.webContents.inspectElement(params.x, params.y),
					),
				},
				{
					label: "Open DevTools",
					click: swallow(() =>
						win.webContents.openDevTools({ mode: "detach" }),
					),
				},
			);
		}

		Menu.buildFromTemplate(template).popup();
	});

	win.webContents.on("will-navigate", (event, navigationUrl) => {
		if (isAllowedAppUrl(navigationUrl)) return;
		event.preventDefault();
		openExternalUrl(shell, navigationUrl).catch((err) => {
			console.warn("[Window] Blocked navigation URL:", err.message);
		});
	});

	if (isDev) {
		addAllowedAppOrigin("http://localhost:31415");
		win.loadURL("http://localhost:31415").catch((err) => {
			console.error("Failed to load start URL", err);
		});
	}

	win.webContents.on(
		"did-fail-load",
		(_event, errorCode, errorDescription, validatedURL) => {
			if (!isDev) {
				const msg = `Failed to load application (code ${errorCode}): ${errorDescription} URL=${validatedURL}`;
				console.error(msg);
				win.webContents.executeJavaScript(
					`document.body.innerHTML = '<div style="font-family:system-ui;padding:2rem;">'+${JSON.stringify("ShadowQuill failed to load.")}+'<br><pre style="white-space:pre-wrap;color:#900;">'+${JSON.stringify("Restart the app. If the issue persists, report this log:")}+'\n'+${JSON.stringify(" ")}+${JSON.stringify(msg)}+'</pre></div>'`,
				);
			}
		},
	);

	// Security: new windows are always denied; URLs route through the external allow-list.
	win.webContents.setWindowOpenHandler((details) => {
		openExternalUrl(shell, details.url).catch((err) => {
			console.warn("[Window] Blocked external URL:", err.message);
		});
		return { action: "deny" };
	});

	return win;
}

module.exports = { createWindow };
