// Electron main process for ShadowQuill standalone
// @ts-nocheck
const { app, BrowserWindow } = require("electron");

const {
	setupDataPaths,
	handleFactoryResetFlag,
} = require("./utils/data-paths.cjs");
const dataPaths = setupDataPaths();
if (dataPaths && handleFactoryResetFlag(dataPaths.userDataDir)) {
	process.exit(0);
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
const { startNextServer } = require("./utils/next-server.cjs");

app.whenReady().then(async () => {
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
		if (serverResult) {
			setHttpServer(serverResult.server);
			const win = createWindow(isDev);
			const port = serverResult.port;
			if (port) {
				win.loadURL(`http://localhost:${port}`).catch((err) => {
					console.error("Failed to load server URL", err);
				});
			}
		}
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow(isDev);
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
