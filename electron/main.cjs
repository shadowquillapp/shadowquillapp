// Electron main process for ShadowQuill standalone
// @ts-nocheck
const { app, BrowserWindow } = require("electron");

const {
	setupDataPaths,
	handleFactoryResetFlag,
	resolveLocalOnlyDataRootsFromEnv,
} = require("./utils/data-paths.cjs");

// Handle factory reset flag before app is ready (using env vars instead of app.getPath)
if (process.argv.includes("--factory-reset")) {
	const envPaths = resolveLocalOnlyDataRootsFromEnv();
	if (envPaths && handleFactoryResetFlag(envPaths.userDataDir)) {
		process.exit(0);
	}
}

const isDev = !app.isPackaged;

if (isDev) {
	process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
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
	// Setup data paths after app is ready (now safe to call app.getPath)
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
		const win = createWindow(isDev);
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
			// startNextServer() already showed an error dialog and called app.quit()
			// No need to show another dialog or quit again
			console.error("[Electron] Server startup failed - error already handled");
		} else {
			// Unexpected case: serverResult exists but has no port
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

app.on("before-quit", () => {
	try {
		const { getHttpServer } = require("./ipc/data-handlers.cjs");
		const httpServer = getHttpServer();
		if (httpServer) {
			console.log("[Electron] Closing production server...");
			httpServer.close();
		}
	} catch (e) {
		console.error("[Electron] Error during cleanup:", e);
	}
});
