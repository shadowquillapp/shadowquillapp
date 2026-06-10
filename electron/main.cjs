// @ts-nocheck
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow, dialog, session } = require("electron");

const {
	setupDataPaths,
	handleFactoryResetFlag,
	resolveLocalOnlyDataRootsFromEnv,
} = require("./utils/data-paths.cjs");

if (process.argv.includes("--factory-reset")) {
	const envPaths = resolveLocalOnlyDataRootsFromEnv();
	if (envPaths && handleFactoryResetFlag(envPaths.userDataDir)) {
		process.exit(0);
	}
}

try {
	const envPaths = resolveLocalOnlyDataRootsFromEnv();
	if (envPaths) {
		try {
			fs.mkdirSync(envPaths.userDataDir, { recursive: true });
		} catch (_) {}
		app.setPath("appData", envPaths.appDataRoot);
		app.setPath("userData", envPaths.userDataDir);
		process.env.SHADOWQUILL_USER_DATA = envPaths.userDataDir;
	}
} catch (e) {
	console.warn("[Electron] Failed to set early data paths:", e);
}

const isDev = !app.isPackaged;

if (isDev) {
	process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

for (const flag of [
	"--disable-cache",
	"--disable-http-cache",
	"--disable-background-networking",
	"--disable-disk-cache",
	"--disable-back-forward-cache",
	"--disable-prompt-on-repost",
	"--disable-component-extensions-with-background-pages",
	"--disable-shared-dictionary",
	"--disable-features=CompressionDictionaryTransportBackend",
	"--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer",
	"--disable-features=TranslateUI",
]) {
	app.commandLine.appendSwitch(flag);
}

const tempCachePath = path.join(os.tmpdir(), `shadowquill-cache-${Date.now()}`);
try {
	fs.mkdirSync(tempCachePath, { recursive: true });
	app.setPath("userCache", tempCachePath);
} catch (e) {
	console.warn("[Electron] Failed to create temp cache directory:", e);
}

require("./ipc/ollama-handlers.cjs");
require("./ipc/window-handlers.cjs");
require("./ipc/find-handlers.cjs");
require("./ipc/system-handlers.cjs");

const {
	registerDataIPCHandlers,
	setHttpServer,
	getHttpServer,
} = require("./ipc/data-handlers.cjs");
const { createWindow } = require("./utils/window-manager.cjs");
const { createApplicationMenu } = require("./utils/menu.cjs");
const { setupSecurity } = require("./utils/security.cjs");
const { addAllowedAppOrigin } = require("./utils/ipc-security.cjs");
const { startNextServer, getServerPort } = require("./utils/next-server.cjs");

function loadServerUrl(win, port, context) {
	addAllowedAppOrigin(`http://127.0.0.1:${port}`);
	win.loadURL(`http://127.0.0.1:${port}`).catch((err) => {
		console.error(`Failed to load server URL${context}`, err);
		dialog.showErrorBox(
			"Failed to Load Application",
			`Could not connect to local server on port ${port}. ${err?.message || "Unknown error"}`,
		);
	});
}

app.whenReady().then(async () => {
	setupDataPaths();

	try {
		registerDataIPCHandlers();
	} catch (_) {}

	try {
		createApplicationMenu();
	} catch (e) {
		console.warn("[Electron] Failed to set custom menu:", e);
	}

	setupSecurity(isDev);

	if (isDev) {
		createWindow(isDev);
	} else {
		const serverResult = await startNextServer();
		if (serverResult?.port) {
			setHttpServer(serverResult.server);
			loadServerUrl(createWindow(isDev), serverResult.port, "");
		} else if (serverResult === null) {
			console.error("[Electron] Server startup failed - error already handled");
		} else {
			console.error("[Electron] Server started but no valid port was returned");
			dialog.showErrorBox(
				"Startup Error",
				"Failed to start internal server. The application will now exit.",
			);
			app.quit();
		}
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			const win = createWindow(isDev);
			if (!isDev) {
				const port = getServerPort();
				if (port) {
					loadServerUrl(win, port, " on activate");
				} else {
					console.error("[Electron] No server port available on activate");
					dialog.showErrorBox(
						"Startup Error",
						"Internal server is not running. The application will now exit.",
					);
					app.quit();
				}
			}
		}
	});
});

app.on("window-all-closed", () => {
	app.quit();
});

let isQuitting = false;

app.on("before-quit", (event) => {
	if (isQuitting) return;
	isQuitting = true;
	event.preventDefault();

	try {
		session.defaultSession.flushStorageData();
		console.log("[Electron] Default session storage flushed");
	} catch (e) {
		console.error("[Electron] Failed to flush default session storage:", e);
	}

	try {
		session.fromPartition("persist:main").flushStorageData();
		console.log("[Electron] Persistent partition storage flushed");
	} catch (_e) {
		console.log(
			"[Electron] Persistent partition not found (this is normal if not used)",
		);
	}

	try {
		const httpServer = getHttpServer();
		if (httpServer) {
			console.log("[Electron] Closing production server...");
			httpServer.close(() => {
				app.quit();
			});
		} else {
			app.quit();
		}
	} catch (e) {
		console.error("[Electron] Error during cleanup:", e);
		app.quit();
	}
});
