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

function getStorageFilePath() {
	try {
		const userData = app.getPath("userData");
		const storageDir = path.join(userData, "storage");
		if (!fs.existsSync(storageDir)) {
			fs.mkdirSync(storageDir, { recursive: true });
		}
		return path.join(storageDir, "app-data.json");
	} catch (e) {
		console.error("[Storage] Failed to get storage file path:", e);
		return null;
	}
}

function loadStorageData() {
	try {
		const filePath = getStorageFilePath();
		if (!filePath) return {};

		if (fs.existsSync(filePath)) {
			const data = fs.readFileSync(filePath, "utf8");
			return JSON.parse(data);
		}
		return {};
	} catch (e) {
		console.error("[Storage] Failed to load storage data:", e);
		return {};
	}
}

function saveStorageData(data) {
	try {
		const filePath = getStorageFilePath();
		if (!filePath) return false;

		const tempPath = `${filePath}.tmp`;
		fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
		fs.renameSync(tempPath, filePath);
		return true;
	} catch (e) {
		console.error("[Storage] Failed to save storage data:", e);
		return false;
	}
}

function registerDataIPCHandlers() {
	const handlerNames = [
		"shadowquill:getDataPaths",
		"shadowquill:factoryReset",
		"shadowquill:restartApp",
		"shadowquill:getEnvSafety",
		"shadowquill:storage:getItem",
		"shadowquill:storage:setItem",
		"shadowquill:storage:removeItem",
		"shadowquill:storage:clear",
		"shadowquill:storage:getAll",
	];

	for (const handlerName of handlerNames) {
		try {
			ipcMain.removeHandler(handlerName);
		} catch (_) {}
	}

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

			// Step 1: Close HTTP server first
			if (httpServer) {
				console.log("[Factory Reset] Closing production server...");
				try {
					httpServer.close();
					httpServer = null;
				} catch (_) {}
			}

			// Step 2: Close all windows to release file handles
			const { BrowserWindow } = require("electron");
			const windows = BrowserWindow.getAllWindows();
			console.log(`[Factory Reset] Closing ${windows.length} window(s)...`);
			for (const win of windows) {
				try {
					if (win.webContents.isDevToolsOpened()) {
						win.webContents.closeDevTools();
					}
					win.webContents.stop();
					win.destroy();
				} catch (e) {
					console.warn("[Factory Reset] Error closing window:", e);
				}
			}

			// Step 3: Clear session storage and cache
			try {
				await session.defaultSession.clearStorageData();
				await session.defaultSession.clearCache();
			} catch (e) {
				console.warn("[Factory Reset] Session clear warning:", e);
			}

			// Step 4: Wait for Windows to release file locks (critical on Windows)
			console.log("[Factory Reset] Waiting for file locks to release...");
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Step 5: Try to delete user data directory
			console.log("[Factory Reset] Deleting user data directory...");
			try {
				if (fs.existsSync(userData)) {
					fs.rmSync(userData, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
					console.log("[Factory Reset] User data deleted successfully.");
				}
			} catch (e) {
				console.warn(
					"[Factory Reset] Could not fully delete user data:",
					e.message,
				);
				console.log("[Factory Reset] App will relaunch and recreate fresh data.");
			}

			// Step 6: Relaunch the app with fresh state
			console.log("[Factory Reset] Relaunching application...");
			app.relaunch();
			app.exit(0);

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

	ipcMain.handle("shadowquill:storage:getItem", (_, key) => {
		try {
			const data = loadStorageData();
			return data[key] ?? null;
		} catch (e) {
			console.error("[Storage] getItem failed:", e);
			return null;
		}
	});

	ipcMain.handle("shadowquill:storage:setItem", (_, key, value) => {
		try {
			const data = loadStorageData();
			data[key] = value;
			return saveStorageData(data);
		} catch (e) {
			console.error("[Storage] setItem failed:", e);
			return false;
		}
	});

	ipcMain.handle("shadowquill:storage:removeItem", (_, key) => {
		try {
			const data = loadStorageData();
			delete data[key];
			return saveStorageData(data);
		} catch (e) {
			console.error("[Storage] removeItem failed:", e);
			return false;
		}
	});

	ipcMain.handle("shadowquill:storage:clear", () => {
		try {
			return saveStorageData({});
		} catch (e) {
			console.error("[Storage] clear failed:", e);
			return false;
		}
	});

	ipcMain.handle("shadowquill:storage:getAll", () => {
		try {
			return loadStorageData();
		} catch (e) {
			console.error("[Storage] getAll failed:", e);
			return {};
		}
	});
}

module.exports = { registerDataIPCHandlers, setHttpServer, getHttpServer };
