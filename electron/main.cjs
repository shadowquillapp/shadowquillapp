// Electron main process for ShadowQuill standalone
// @ts-nocheck
const path = require("node:path");
const {
	app,
	BrowserWindow,
	shell,
	session,
	dialog,
	ipcMain,
	Menu,
} = require("electron");
const si = require("systeminformation");
const fs = require("node:fs");
const http = require("node:http");
/** @type {number|null} */
let nextServerPort = null;
/** @type {import('http').Server|null} */
let httpServer = null;

// Ensure a stable LOCAL-ONLY userData path labeled "ShadowQuill" in dev and prod.
// Never rely on roaming or synced folders—everything must stay on-device.
function resolveLocalOnlyDataRoots() {
	const homeDir = app.getPath("home");
	if (process.platform === "win32") {
		const localBase = process.env.LOCALAPPDATA?.trim().length
			? process.env.LOCALAPPDATA
			: path.join(homeDir, "AppData", "Local");
		return {
			appDataRoot: localBase,
			userDataDir: path.join(localBase, "ShadowQuill"),
		};
	}

	if (process.platform === "darwin") {
		const appDataRoot = path.join(homeDir, "Library", "Application Support");
		return {
			appDataRoot,
			userDataDir: path.join(appDataRoot, "ShadowQuill"),
		};
	}

	// Default to XDG local share for Linux / other POSIX platforms
	const appDataRoot = path.join(homeDir, ".local", "share");
	return {
		appDataRoot,
		userDataDir: path.join(appDataRoot, "ShadowQuill"),
	};
}

try {
	const { appDataRoot, userDataDir } = resolveLocalOnlyDataRoots();
	try {
		fs.mkdirSync(userDataDir, { recursive: true });
	} catch (_) {
		/* rip */
	}
	app.setPath("appData", appDataRoot);
	app.setPath("userData", userDataDir);
	// Set userData path as env var for Logger to use
	process.env.SHADOWQUILL_USER_DATA = userDataDir;

	// Handle --factory-reset flag: Wipe data before app fully loads to avoid EBUSY locks
	if (process.argv.includes("--factory-reset")) {
		console.log("[Factory Reset] Clean start detected. Wiping user data...");
		try {
			// Synchronous delay to ensure previous instance locks are released
			const end = Date.now() + 1500;
			while (Date.now() < end) { /* busy wait */ }

			if (fs.existsSync(userDataDir)) {
				// Try rename-then-delete strategy
				const trashPath = userDataDir + "-trash-" + Date.now();
				try {
					fs.renameSync(userDataDir, trashPath);
					fs.rmSync(trashPath, { recursive: true, force: true });
				} catch (e) {
					// Fallback to direct delete if rename fails
					console.warn("[Factory Reset] Rename failed, trying direct delete:", e.message);
					fs.rmSync(userDataDir, { recursive: true, force: true });
				}
			}
			console.log("[Factory Reset] Data wiped successfully. Shutting down.");
		} catch (e) {
			console.error("[Factory Reset] Wipe failed:", e);
		}

		app.exit(0);
	}
} catch (_) {
	/* ignore */
}

// Treat anything not packaged as dev. Rely on app.isPackaged instead of NODE_ENV
// because packaged builds often don't set NODE_ENV.
const isDev = !app.isPackaged;

// Suppress Electron security warnings in development (expected when using 'unsafe-eval' for Next.js HMR)
// These warnings won't appear in production builds anyway, and suppressing them in dev keeps the console clean
if (isDev) {
	process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

function checkAndOptionallyClearZoneIdentifier() {
	const execPath = process.execPath;
	if (process.platform !== "win32")
		return { zoneIdentifierPresent: false, removed: false };
	const adsPath = `${execPath}:Zone.Identifier`;
	try {
		if (fs.existsSync(adsPath)) {
			// Try read for diagnostics then remove
			let removed = false;
			try {
				fs.readFileSync(adsPath, "utf8");
			} catch (_) {}
			try {
				fs.unlinkSync(adsPath);
				removed = true;
			} catch (_) {}
			return { zoneIdentifierPresent: true, removed };
		}
	} catch (_) {}
	return { zoneIdentifierPresent: false, removed: false };
}

// Register IPC handlers early - before app.whenReady() to ensure they're available immediately

// Check if Ollama is installed
ipcMain.handle("shadowquill:checkOllamaInstalled", async () => {
	try {
		if (process.platform === "darwin") {
			// macOS: Check if Ollama.app exists
			const { execSync } = require("node:child_process");
			try {
				execSync(
					'mdfind "kMDItemKind == Application && kMDItemFSName == Ollama.app"',
					{ timeout: 3000 },
				);
				return { installed: true };
			} catch (_) {
				return { installed: false };
			}
		} else if (process.platform === "win32") {
			// Windows: Check common installation paths
			const possiblePaths = [
				path.join(
					process.env.LOCALAPPDATA || "",
					"Programs",
					"Ollama",
					"ollama app.exe",
				),
				path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama app.exe"),
			];

			for (const ollamaPath of possiblePaths) {
				if (fs.existsSync(ollamaPath)) {
					return { installed: true };
				}
			}
			return { installed: false };
		} else {
			// Linux: Check if ollama command exists
			const { execSync } = require("node:child_process");
			try {
				execSync("which ollama", { timeout: 3000 });
				return { installed: true };
			} catch (_) {
				try {
					execSync("command -v ollama", { timeout: 3000 });
					return { installed: true };
				} catch (_) {
					return { installed: false };
				}
			}
		}
	} catch (e) {
		return { installed: false };
	}
});

// Open Ollama application
ipcMain.handle("shadowquill:openOllama", async () => {
	try {
		const { spawn } = require("node:child_process");

		if (process.platform === "darwin") {
			// macOS: Open Ollama.app
			spawn("open", ["-a", "Ollama"]);
			return { ok: true };
		}
		if (process.platform === "win32") {
			// Windows: Try to launch Ollama from common locations
			const possiblePaths = [
				path.join(
					process.env.LOCALAPPDATA || "",
					"Programs",
					"Ollama",
					"ollama app.exe",
				),
				path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama app.exe"),
				"ollama", // Try from PATH
			];

			let launched = false;
			for (const ollamaPath of possiblePaths) {
				try {
					if (ollamaPath !== "ollama" && !fs.existsSync(ollamaPath)) continue;
					spawn(ollamaPath, [], { detached: true, stdio: "ignore" });
					launched = true;
					break;
				} catch (_) {
					/* try next path */
				}
			}

			if (!launched) {
				return {
					ok: false,
					error: "Ollama not found. Please install from https://ollama.com",
				};
			}
			return { ok: true };
		}
		// Linux: Try systemctl or direct command
		try {
			spawn("systemctl", ["--user", "start", "ollama"], {
				detached: true,
				stdio: "ignore",
			});
			return { ok: true };
		} catch (_) {
			try {
				spawn("ollama", ["serve"], { detached: true, stdio: "ignore" });
				return { ok: true };
			} catch (_) {
				return {
					ok: false,
					error:
						"Could not start Ollama. Please start it manually or install from https://ollama.com",
				};
			}
		}
	} catch (e) {
		return { ok: false, error: e?.message || "Failed to open Ollama" };
	}
});

// Restart the Electron application (used after DB reset)
ipcMain.handle("shadowquill:restartApp", async () => {
	try {
		console.log("[Restart] Initiating app restart...");
		
		// Close HTTP server if running
		if (httpServer) {
			console.log("[Restart] Closing HTTP server...");
			try {
				httpServer.close();
				httpServer = null;
			} catch (_) {}
		}
		
		// Close all windows and clean up
		const windows = BrowserWindow.getAllWindows();
		console.log(`[Restart] Closing ${windows.length} window(s)...`);
		for (const win of windows) {
			try {
				// Close dev tools if open
				if (win.webContents.isDevToolsOpened()) {
					win.webContents.closeDevTools();
				}
				// Stop any ongoing loads
				win.webContents.stop();
				// Destroy the window
				win.destroy();
			} catch (e) {
				console.warn("[Restart] Error closing window:", e);
			}
		}
		
		// Give a moment for cleanup to complete
		await new Promise(resolve => setTimeout(resolve, 500));
		
		// Relaunch with fresh state
		console.log("[Restart] Relaunching application...");
		app.relaunch();
		app.exit(0);
		
		return { ok: true };
	} catch (e) {
		console.error("[Restart] Failed:", e);
		return { ok: false, error: e?.message || "Failed to restart" };
	}
});

ipcMain.handle("shadowquill:getEnvSafety", () => {
	const execPath = process.execPath;
	const inDownloads = /[\\/](Downloads|downloads)[\\/]/.test(execPath);
	const zone = checkAndOptionallyClearZoneIdentifier();
	return {
		execPath,
		inDownloads,
		zoneIdentifierPresent: zone.zoneIdentifierPresent,
		zoneRemoved: zone.removed,
	};
});

// Robustly register data IPC handlers (safe to call multiple times)
function registerDataIPCHandlers() {
	try {
		ipcMain.removeHandler("shadowquill:getDataPaths");
	} catch (_) {}
	try {
		ipcMain.removeHandler("shadowquill:factoryReset");
	} catch (_) {}

	// Expose resolved data paths for UI
	ipcMain.handle("shadowquill:getDataPaths", () => {
		try {
			const userData = app.getPath("userData");
			const localStorageDir = path.join(userData, "Local Storage");
			const localStorageLevelDb = path.join(localStorageDir, "leveldb");
			return {
				ok: true,
				userData,
				localStorageDir,
				localStorageLevelDb,
			};
		} catch (e) {
			return { ok: false, error: e?.message || "Failed to resolve data paths" };
		}
	});

	// Factory reset: clear Chromium storage (localStorage, IndexedDB, etc)
	ipcMain.handle("shadowquill:factoryReset", async () => {
		try {
			console.log("[Factory Reset] Triggered. Clearing session and restarting with cleanup flag...");
			
			// Clear all persistent storage for the default session
			try {
				await session.defaultSession.clearStorageData();
				await session.defaultSession.clearCache();
			} catch (e) {
				console.warn("[Factory Reset] Soft clear warning:", e);
			}

			// Relaunch the app with a flag to perform file deletion on startup
			// This avoids EBUSY errors because the new process handles deletion 
			// before locking any files.
			const args = process.argv.slice(1).concat(["--factory-reset"]);
			app.relaunch({ args });
			app.exit(0);

			return { ok: true };
		} catch (e) {
			console.error("[Factory Reset] Failed:", e);
			return { ok: false, error: e?.message || "Factory reset failed" };
		}
	});
}
// Register immediately and again on ready (in case of race during startup)
try {
	registerDataIPCHandlers();
} catch (_) {}

// Window controls for custom frameless UI
ipcMain.handle("shadowquill:window:minimize", (e) => {
	const w = BrowserWindow.fromWebContents(e.sender);
	if (w) w.minimize();
});
ipcMain.handle("shadowquill:window:maximizeToggle", (e) => {
	const w = BrowserWindow.fromWebContents(e.sender);
	if (!w) return;
	if (w.isMaximized()) w.unmaximize();
	else w.maximize();
});
ipcMain.handle("shadowquill:window:close", () => {
	// Force full app quit - terminates all processes and background tasks
	// This works in both dev and production mode
	app.quit();
});

// Display / View controls
ipcMain.handle("shadowquill:view:getZoomFactor", (e) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return 1;
		return w.webContents.getZoomFactor();
	} catch (_) {
		return 1;
	}
});
ipcMain.handle("shadowquill:view:setZoomFactor", (e, factor) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return { ok: false, error: "No window" };
		let f = Number(factor);
		if (!Number.isFinite(f)) f = 1;
		// Clamp to a sensible range
		f = Math.max(0.5, Math.min(3, f));
		w.webContents.setZoomFactor(f);
		return { ok: true, zoomFactor: f };
	} catch (err) {
		return { ok: false, error: err?.message || "Failed to set zoom" };
	}
});
ipcMain.handle("shadowquill:view:resetZoom", (e) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return { ok: false, error: "No window" };
		w.webContents.setZoomFactor(1);
		return { ok: true, zoomFactor: 1 };
	} catch (err) {
		return { ok: false, error: err?.message || "Failed to reset zoom" };
	}
});
ipcMain.handle("shadowquill:window:getSize", (e) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return { ok: false, error: "No window" };
		const windowSize = w.getSize();
		const contentSize = w.getContentSize();
		return {
			ok: true,
			windowSize, // [width, height]
			contentSize, // [width, height]
			isMaximized: w.isMaximized(),
			isFullScreen: w.isFullScreen(),
		};
	} catch (err) {
		return { ok: false, error: err?.message || "Failed to get size" };
	}
});

// Expose platform information for UI customization
ipcMain.handle("shadowquill:getPlatform", () => {
	return process.platform;
});

ipcMain.handle("shadowquill:getSystemSpecs", async () => {
	try {
		const [cpu, mem, graphics] = await Promise.all([
			si.cpu(),
			si.mem(),
			si.graphics(),
		]);

		let cpuBrand = cpu.brand;
		// Clean up CPU string
		cpuBrand = cpuBrand
			.replace(/Gen\s+/i, "")
			.replace(/Intel\s+/i, "")
			.replace(/AMD\s+/i, "")
			.replace(/Core\s+/i, "")
			.replace(/\(R\)/g, "")
			.replace(/\(TM\)/g, "")
			.trim();

		let gpuModel = graphics.controllers[0]?.model || "Unknown GPU";
		// Clean up GPU string
		gpuModel = gpuModel
			.replace(/NVIDIA\s+/i, "")
			.replace(/GeForce\s+/i, "")
			.replace(/AMD\s+/i, "")
			.replace(/Radeon\s+/i, "")
			.trim();

		return {
			cpu: cpuBrand,
			ram: mem.total,
			gpu: gpuModel,
		};
	} catch (e) {
		console.error("Failed to fetch system specs:", e);
		return { cpu: "Unknown", ram: 0, gpu: "Unknown" };
	}
});

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 850,
			minWidth: 1045,
		minHeight: 850,
		// Use a frameless window on macOS and Windows so only our custom titlebar is visible.
		...(process.platform === "darwin" || process.platform === "win32"
			? { frame: false }
			: {}),
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.cjs"),
			// Enable built-in Chromium spellchecker
			spellcheck: true,
		},
		title: "",
	});

	// Hard guard against programmatic or edge-case resize attempts below limits
	win.on("will-resize", (event, newBounds) => {
		if (newBounds.width < 1045 || newBounds.height < 850) {
			event.preventDefault();
		}
	});

	// Filter console messages to suppress harmless autofill errors
	win.webContents.once("did-finish-load", () => {
		win.webContents.executeJavaScript(`
      (function() {
        const originalError = console.error;
        console.error = function(...args) {
          const message = args.join(' ');
          // Filter out harmless DevTools autofill errors
          if (message.includes("Request Autofill.enable failed") || 
              message.includes("Request Autofill.setAddresses failed")) {
            return; // Just ignore these specific errors
          }
          originalError.apply(console, args);
        };
      })();
    `);
	});

	// Basic spellchecker language setup (can be expanded later)
	try {
		const langs = ["en-US"];
		win.webContents.session.setSpellCheckerLanguages(langs);
	} catch (e) {
		/* ignore if not available */
	}

	// Track spellcheck toggle state manually
	let spellcheckEnabled = true;

	// Enhanced context menu with spellcheck suggestions
	win.webContents.on("context-menu", (event, params) => {
		/** @type {import('electron').MenuItemConstructorOptions[]} */
		const template = [];

		// If there is a misspelled word under cursor, show suggestions first
		if (params.misspelledWord) {
			const suggestions = (params.dictionarySuggestions || []).slice(0, 6);
			if (suggestions.length) {
				suggestions.forEach((s, idx) => {
					template.push({
						label: s,
						// Use bold for first suggestion for subtle emphasis
						accelerator: idx === 0 ? undefined : undefined,
						click: () => {
							try {
								win.webContents.replaceMisspelling(s);
							} catch (_) {}
						},
					});
				});
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

		// Standard editing actions
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

		// Spelling submenu
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
								// Clearing languages effectively disables suggestions
								win.webContents.session.setSpellCheckerLanguages([]);
							}
						} catch (_) {}
					},
				},
			],
		});

		// Developer tools entries
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

	const startUrl = isDev
		? "http://localhost:3000"
		: nextServerPort
			? `http://localhost:${nextServerPort}`
			: "about:blank";
	win.loadURL(startUrl).catch((err) => {
		console.error("Failed to load start URL", startUrl, err);
	});

	// Show a basic fallback message if something goes wrong in production
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

	/** @param {any} details */
	win.webContents.setWindowOpenHandler((details) => {
		const url = details.url;
		shell.openExternal(url);
		return { action: "deny" };
	});
}

app.whenReady().then(async () => {
	// Ensure IPC handlers are registered after ready as well
	try {
		registerDataIPCHandlers();
	} catch (_) {}
	// Build a custom application menu that:
	// - Keeps File & Edit menus (standard roles)
	// - Keeps View but removes Developer Tools toggle
	// - Removes Help and Window menus entirely
	// - Adds macOS app menu if on darwin
	try {
		const isMac = process.platform === "darwin";
		/** @type {import('electron').MenuItemConstructorOptions[]} */
		const template = [];
		if (isMac) {
			template.push({
				label: app.name,
				submenu: [
					{ role: "about" },
					{ type: "separator" },
					{ role: "services" },
					{ type: "separator" },
					{ role: "hide" },
					{ role: "hideOthers" },
					{ role: "unhide" },
					{ type: "separator" },
					{ role: "quit" },
				],
			});
		}
		template.push(
			{
				label: "File",
				submenu: isMac ? [{ role: "close" }] : [{ role: "quit" }],
			},
			{
				label: "Edit",
				submenu: [
					{ role: "undo" },
					{ role: "redo" },
					{ type: "separator" },
					{ role: "cut" },
					{ role: "copy" },
					{ role: "paste" },
					{ role: "pasteAndMatchStyle" },
					{ role: "delete" },
					{ role: "selectAll" },
				],
			},
			{
				label: "View",
				submenu: [
					{ role: "reload" },
					{ role: "forceReload" },
					{ type: "separator" },
					{ role: "resetZoom" },
					{ role: "zoomIn" },
					{ role: "zoomOut" },
					{ type: "separator" },
					{ role: "togglefullscreen" },
					// Intentionally omitted: toggleDevTools
				],
			},
		);
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
	} catch (e) {
		console.warn("[Electron] Failed to set custom menu:", e);
	}

	// Secure CSP configuration - only allow 'unsafe-eval' in development (required for Next.js HMR)
	// In production, we use a stricter policy without 'unsafe-eval'
	const scriptSrc = isDev
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:*"
		: "script-src 'self' 'unsafe-inline' http://localhost:* https://localhost:*";
	const cspPolicy = [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https: http:",
		"connect-src 'self' http://localhost:* https://localhost:* https://fonts.googleapis.com https://fonts.gstatic.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join("; ");

	session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
		cb({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": [cspPolicy],
				"X-Content-Type-Options": ["nosniff"],
				"X-Frame-Options": ["DENY"],
				"X-XSS-Protection": ["1; mode=block"],
			},
		});
	});

	if (isDev) {
		createWindow(); // Create window immediately in dev mode
	} else {
		// Production: start embedded Next.js server (needed for dynamic routes like NextAuth)
		process.env.ELECTRON = "1";
		process.env.NODE_ENV = "production";
		try {
			console.log(
				"[Electron] Starting embedded Next.js server (packaged). __dirname=",
				__dirname,
				"node",
				process.version,
				"platform",
				process.platform,
				"electron",
				process.versions.electron,
			);
			const appDir = path.join(__dirname, "..");
			// Determine the correct application directory that contains .next when packaged
			const resourcesDir =
				process.resourcesPath || path.join(__dirname, "..", "..");
			const unpackedDir = path.join(resourcesDir, "app.asar.unpacked");
			const candidateDirs = [unpackedDir, appDir];
			const nextAppDir =
				candidateDirs.find((d) => {
					try {
						return fs.existsSync(path.join(d, ".next"));
					} catch (_) {
						return false;
					}
				}) || appDir;
			const nextDir = path.join(nextAppDir, ".next");
			if (!fs.existsSync(nextDir)) {
				console.warn("[Electron] .next directory missing at", nextDir);
			} else {
				try {
					const files = fs.readdirSync(nextDir).slice(0, 20);
					console.log("[Electron] .next contents sample:", files);
				} catch (e) {
					console.warn("[Electron] Could not list .next contents", e);
				}
			}
			try {
				process.chdir(nextAppDir);
			} catch (_) {}
			// Robustly resolve Next factory from packaged node_modules
			let nextFactory = null;
			const nextCandidates = [
				path.join(
					unpackedDir,
					"node_modules",
					"next",
					"dist",
					"server",
					"next.js",
				),
				path.join(
					nextAppDir,
					"node_modules",
					"next",
					"dist",
					"server",
					"next.js",
				),
			];
			for (const p of nextCandidates) {
				try {
					if (fs.existsSync(p)) {
						// eslint-disable-next-line import/no-dynamic-require, global-require
						const mod = require(p);
						nextFactory =
							typeof mod === "function"
								? mod
								: typeof mod.default === "function"
									? mod.default
									: mod.next || mod.default?.next;
						break;
					}
				} catch (_) {
					/* ignore and continue */
				}
			}
			if (!nextFactory) {
				try {
					nextFactory = require("next");
				} catch (eReq) {
					console.error(
						'[Electron] Failed to require("next") direct, attempting dist path',
						eReq?.stack || eReq,
					);
					try {
						const alt = require("next/dist/server/next");
						nextFactory =
							typeof alt === "function"
								? alt
								: typeof alt.default === "function"
									? alt.default
									: alt.next || alt.default?.next;
					} catch (eAlt) {
						console.error(
							"[Electron] Secondary require attempt failed",
							eAlt?.stack || eAlt,
						);
						throw eReq;
					}
				}
			}
			if (typeof nextFactory !== "function") {
				throw new Error(
					`Resolved Next factory is not a function: type=${typeof nextFactory}`,
				);
			}
			const nextApp = nextFactory({ dev: false, dir: nextAppDir });
			await nextApp.prepare();
			console.log("[Electron] Next.js prepared. Creating HTTP server...");
			const handle = nextApp.getRequestHandler();
			httpServer = http.createServer((req, res) => handle(req, res));
			await new Promise((resolve) =>
				httpServer.listen(0, () => resolve(undefined)),
			);
			const addr = httpServer.address();
			console.log("[Electron] Server listening on", addr);
			if (addr && typeof addr === "object") nextServerPort = addr.port;
			createWindow();
		} catch (e) {
			console.error("Failed to start embedded Next.js server", e?.stack || e);
			let wrote = false;
			try {
				const errPath = path.join(app.getPath("userData"), "startup-error.log");
				fs.mkdirSync(app.getPath("userData"), { recursive: true });
				fs.writeFileSync(errPath, `Error starting server:\n${e?.stack || e}`);
				wrote = true;
			} catch (_) {
				/* ignore */
			}
			// Attempt static fallback: serve pre-rendered HTML if available
			try {
				const htmlCandidates = [
					path.join(nextAppDir, ".next", "server", "app", "workbench", "index.html"),
					path.join(nextAppDir, ".next", "server", "app", "index.html"),
				];
				const fallbackHtml = htmlCandidates.find((p) => {
					try {
						return fs.existsSync(p);
					} catch (_) {
						return false;
					}
				});
				if (fallbackHtml) {
					console.log("[Electron] Using static fallback HTML");
					httpServer = http.createServer((req, res) => {
						fs.createReadStream(fallbackHtml).pipe(res);
					});
					await new Promise((r) => httpServer.listen(0, () => r(undefined)));
					const addr = httpServer.address();
					if (addr && typeof addr === "object") nextServerPort = addr.port;
					createWindow();
					return;
				}
			} catch (e2) {
				console.error("Static fallback failed", e2);
			}
			dialog.showErrorBox(
				"Startup Error",
				`Failed to start internal server. ${wrote ? "See startup-error.log in app data." : ""}`,
			);
			app.quit();
			return;
		}
		return;
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	app.quit();
});

// Cleanup before quitting - close HTTP servers and any background tasks
app.on("before-quit", (event) => {
	try {
		// Close HTTP server if it exists
		if (httpServer) {
			console.log("[Electron] Closing HTTP server...");
			httpServer.close();
			httpServer = null;
		}
	} catch (e) {
		console.error("[Electron] Error during cleanup:", e);
	}
});
