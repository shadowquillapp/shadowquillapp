// Window creation and management
const path = require("node:path");
const { BrowserWindow, shell, Menu } = require("electron");
const { loadWindowState, saveWindowState } = require("./window-state.cjs");

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
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "..", "preload.cjs"),
			spellcheck: true,
		},
		title: "",
	});

	if (windowState.isMaximized) {
		win.maximize();
	}

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
	});

	win.webContents.once("did-finish-load", () => {
		win.webContents.setZoomFactor(1.0);

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
	});

	try {
		const langs = ["en-US"];
		win.webContents.session.setSpellCheckerLanguages(langs);
	} catch (e) {
		/* ignore */
	}

	win.webContents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown") return;
		const isModified = input.control || input.meta;
		if (!isModified) return;

		if (
			input.key === "+" ||
			input.key === "=" ||
			input.key === "Add" ||
			(input.shift && input.key === "=")
		) {
			event.preventDefault();
			const current = win.webContents.getZoomFactor();
			const newZoom = Math.min(1.5, current + 0.1);
			win.webContents.setZoomFactor(newZoom);
			win.webContents.send("shadowquill:zoom:changed", newZoom);
			return;
		}

		if (input.key === "-" || input.key === "Subtract") {
			event.preventDefault();
			const current = win.webContents.getZoomFactor();
			const newZoom = Math.max(0.8, current - 0.1);
			win.webContents.setZoomFactor(newZoom);
			win.webContents.send("shadowquill:zoom:changed", newZoom);
			return;
		}

		if (input.key === "0") {
			event.preventDefault();
			win.webContents.setZoomFactor(1.0);
			win.webContents.send("shadowquill:zoom:changed", 1.0);
			return;
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
		} catch (_) {
			/* ignore */
		}
	});

	let spellcheckEnabled = true;

	win.webContents.on("context-menu", (event, params) => {
		/** @type {import('electron').MenuItemConstructorOptions[]} */
		const template = [];

		if (params.misspelledWord) {
			const suggestions = (params.dictionarySuggestions || []).slice(0, 6);
			if (suggestions.length) {
				for (const s of suggestions) {
					template.push({
						label: s,
						click: () => {
							try {
								win.webContents.replaceMisspelling(s);
							} catch (_) {}
						},
					});
				}
			} else {
				template.push({ label: "No Suggestions", enabled: false });
			}
			template.push({ type: "separator" });
			template.push({
				label: `Add to Dictionary: "${params.misspelledWord}"`,
				click: () => {
					try {
						win.webContents.session.addWordToSpellCheckerDictionary(
							params.misspelledWord,
						);
					} catch (_) {}
				},
			});
			template.push({ type: "separator" });
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
		);

		template.push({
			label: "Spelling",
			submenu: [
				{
					label: "Check Spelling While Typing",
					type: "checkbox",
					checked: spellcheckEnabled,
					click: () => {
						spellcheckEnabled = !spellcheckEnabled;
						try {
							if (spellcheckEnabled) {
								win.webContents.session.setSpellCheckerLanguages(["en-US"]);
							} else {
								win.webContents.session.setSpellCheckerLanguages([]);
							}
						} catch (_) {}
					},
				},
			],
		});

		template.push({ type: "separator" });
		template.push({
			label: "Inspect Element",
			click: () => {
				try {
					win.webContents.inspectElement(params.x, params.y);
				} catch (_) {}
			},
		});
		template.push({
			label: "Open DevTools",
			click: () => {
				try {
					win.webContents.openDevTools({ mode: "detach" });
				} catch (_) {}
			},
		});

		const contextMenu = Menu.buildFromTemplate(template);
		contextMenu.popup();
	});

	if (isDev) {
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

	win.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	return win;
}

module.exports = { createWindow };
