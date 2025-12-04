// IPC handlers for data paths and factory reset
const path = require("node:path");
const fs = require("node:fs");
const { ipcMain, app, session } = require("electron");

let httpServer = null;

function setHttpServer(server) {
	httpServer = server;
}

function getHttpServer() {
	return httpServer;
}

function registerDataIPCHandlers() {
	// Remove all existing handlers to avoid duplicates
	const handlerNames = [
		"shadowquill:getDataPaths",
		"shadowquill:factoryReset",
		"shadowquill:restartApp",
		"shadowquill:getEnvSafety",
	];

	for (const handlerName of handlerNames) {
		try {
			ipcMain.removeHandler(handlerName);
		} catch (_) {
			// Handler may not exist, ignore
		}
	}

	// Re-register all handlers
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

	ipcMain.handle("shadowquill:factoryReset", async () => {
		try {
			console.log(
				"[Factory Reset] Triggered. Clearing all data and closing...",
			);

			const userData = app.getPath("userData");

			try {
				await session.defaultSession.clearStorageData();
				await session.defaultSession.clearCache();
			} catch (e) {
				console.warn("[Factory Reset] Session clear warning:", e);
			}

			if (httpServer) {
				console.log("[Factory Reset] Closing production server...");
				try {
					httpServer.close();
					httpServer = null;
				} catch (_) {}
			}

			console.log("[Factory Reset] Deleting user data directory...");
			try {
				if (fs.existsSync(userData)) {
					fs.rmSync(userData, { recursive: true, force: true });
					console.log("[Factory Reset] User data deleted successfully.");
				}
			} catch (e) {
				console.warn(
					"[Factory Reset] Could not fully delete user data:",
					e.message,
				);
			}

			console.log("[Factory Reset] Closing application...");
			app.quit();

			return { ok: true };
		} catch (e) {
			console.error("[Factory Reset] Failed:", e);
			return { ok: false, error: e?.message || "Factory reset failed" };
		}
	});

	ipcMain.handle("shadowquill:restartApp", async () => {
		try {
			console.log("[Restart] Initiating app restart...");

			if (httpServer) {
				console.log("[Restart] Closing production server...");
				try {
					httpServer.close();
					httpServer = null;
				} catch (_) {}
			}

			const { BrowserWindow } = require("electron");
			const windows = BrowserWindow.getAllWindows();
			console.log(`[Restart] Closing ${windows.length} window(s)...`);
			for (const win of windows) {
				try {
					if (win.webContents.isDevToolsOpened()) {
						win.webContents.closeDevTools();
					}
					win.webContents.stop();
					win.destroy();
				} catch (e) {
					console.warn("[Restart] Error closing window:", e);
				}
			}

			await new Promise((resolve) => setTimeout(resolve, 500));

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
		const {
			checkAndOptionallyClearZoneIdentifier,
		} = require("../utils/data-paths.cjs");
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
}

module.exports = { registerDataIPCHandlers, setHttpServer, getHttpServer };
