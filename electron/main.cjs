// @ts-nocheck
const { app, BrowserWindow } = require("electron");

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
		const fs = require("node:fs");
		try {
			fs.mkdirSync(envPaths.userDataDir, { recursive: true });
		} catch (_) {
			/* ignore */
		}
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

app.commandLine.appendSwitch("--disable-cache");
app.commandLine.appendSwitch("--disable-http-cache");
app.commandLine.appendSwitch("--disable-background-networking");
app.commandLine.appendSwitch("--disable-disk-cache");
app.commandLine.appendSwitch("--disable-back-forward-cache");
app.commandLine.appendSwitch("--disable-hang-monitor");
app.commandLine.appendSwitch("--disable-prompt-on-repost");
app.commandLine.appendSwitch(
	"--disable-component-extensions-with-background-pages",
);
app.commandLine.appendSwitch("--disable-shared-dictionary");
app.commandLine.appendSwitch(
	"--disable-features=CompressionDictionaryTransportBackend",
);
app.commandLine.appendSwitch(
	"--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer",
);
app.commandLine.appendSwitch("--disable-background-timer-throttling");
app.commandLine.appendSwitch("--disable-renderer-backgrounding");
app.commandLine.appendSwitch("--disable-features=TranslateUI");
app.commandLine.appendSwitch("--disable-ipc-flooding-protection");

const os = require("node:os");
const tempCachePath = require("node:path").join(
	os.tmpdir(),
	`shadowquill-cache-${Date.now()}`,
);
try {
	require("node:fs").mkdirSync(tempCachePath, { recursive: true });
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
} = require("./ipc/data-handlers.cjs");
const { createWindow } = require("./utils/window-manager.cjs");
const { createApplicationMenu } = require("./utils/menu.cjs");
const { setupSecurity } = require("./utils/security.cjs");
const { startNextServer, getServerPort } = require("./utils/next-server.cjs");

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
		const _win = createWindow(isDev);
	} else {
		const serverResult = await startNextServer();
		if (serverResult?.port) {
			setHttpServer(serverResult.server);
			const win = createWindow(isDev);
			win.loadURL(`http://localhost:${serverResult.port}`).catch((err) => {
				console.error("Failed to load server URL", err);
				const { dialog } = require("electron");
				dialog.showErrorBox(
					"Failed to Load Application",
					`Could not connect to local server on port ${serverResult.port}. ${err?.message || "Unknown error"}`,
				);
			});
		} else if (serverResult === null) {
			console.error("[Electron] Server startup failed - error already handled");
		} else {
			console.error("[Electron] Server started but no valid port was returned");
			const { dialog } = require("electron");
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
					win.loadURL(`http://localhost:${port}`).catch((err) => {
						console.error("Failed to load server URL on activate", err);
						const { dialog } = require("electron");
						dialog.showErrorBox(
							"Failed to Load Application",
							`Could not connect to local server on port ${port}. ${err?.message || "Unknown error"}`,
						);
					});
				} else {
					console.error("[Electron] No server port available on activate");
					const { dialog } = require("electron");
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

	const { session } = require("electron");
	try {
		session.defaultSession.flushStorageData();
		console.log("[Electron] Default session storage flushed");
	} catch (e) {
		console.error("[Electron] Failed to flush default session storage:", e);
	}

	try {
		const persistentSession = session.fromPartition("persist:main");
		persistentSession.flushStorageData();
		console.log("[Electron] Persistent partition storage flushed");
	} catch (_e) {
		console.log(
			"[Electron] Persistent partition not found (this is normal if not used)",
		);
	}

	try {
		const { getHttpServer } = require("./ipc/data-handlers.cjs");
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
