const path = require("node:path");
const fs = require("node:fs");
const { ipcMain, app, session, BrowserWindow } = require("electron");
const { requireValidIpcSender } = require("../utils/ipc-security.cjs");
const {
	checkAndOptionallyClearZoneIdentifier,
} = require("../utils/data-paths.cjs");

let httpServer = null;

function setHttpServer(server) {
	httpServer = server;
}

function getHttpServer() {
	return httpServer;
}

function getStorageFilePath() {
	try {
		const storageDir = path.join(app.getPath("userData"), "storage");
		fs.mkdirSync(storageDir, { recursive: true });
		return path.join(storageDir, "app-data.json");
	} catch (e) {
		console.error("[Storage] Failed to get storage file path:", e);
		return null;
	}
}

function loadStorageData() {
	try {
		const filePath = getStorageFilePath();
		if (!filePath || !fs.existsSync(filePath)) return {};
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch (e) {
		console.error("[Storage] Failed to load storage data:", e);
		return {};
	}
}

function saveStorageData(data) {
	try {
		const filePath = getStorageFilePath();
		if (!filePath) return false;
		// Atomic write: temp file + rename so a crash never truncates app-data.json.
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
	const secureHandle = (channel, handler) => {
		try {
			ipcMain.removeHandler(channel);
		} catch (_) {}
		ipcMain.handle(channel, (event, ...args) => {
			requireValidIpcSender(event);
			return handler(event, ...args);
		});
	};

	secureHandle("shadowquill:getDataPaths", () => {
		try {
			const userData = app.getPath("userData");
			const localStorageDir = path.join(userData, "Local Storage");
			return {
				ok: true,
				userData,
				localStorageDir,
				localStorageLevelDb: path.join(localStorageDir, "leveldb"),
			};
		} catch (e) {
			return { ok: false, error: e?.message || "Failed to resolve data paths" };
		}
	});

	secureHandle("shadowquill:factoryReset", async () => {
		try {
			console.log("[Factory Reset] Clearing all application data...");
			saveStorageData({});

			const sessions = [
				session.defaultSession,
				session.fromPartition("persist:main"),
			];
			for (const targetSession of sessions) {
				await targetSession.clearStorageData();
				await targetSession.clearCache();
			}

			try {
				const statePath = path.join(
					app.getPath("userData"),
					"window-state.json",
				);
				if (fs.existsSync(statePath)) {
					fs.unlinkSync(statePath);
				}
			} catch (e) {
				console.warn("[Factory Reset] Could not delete window state:", e);
			}

			console.log("[Factory Reset] All data cleared successfully.");
			return { ok: true };
		} catch (e) {
			console.error("[Factory Reset] Failed:", e);
			return { ok: false, error: e?.message || "Factory reset failed" };
		}
	});

	secureHandle("shadowquill:restartApp", async () => {
		try {
			console.log("[Restart] Initiating app restart...");
			if (httpServer) {
				console.log("[Restart] Closing production server...");
				try {
					httpServer.close();
					httpServer = null;
				} catch (_) {}
			}

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

	secureHandle("shadowquill:getEnvSafety", () => {
		const execPath = process.execPath;
		const zone = checkAndOptionallyClearZoneIdentifier();
		return {
			execPath,
			inDownloads: /[\\/](Downloads|downloads)[\\/]/.test(execPath),
			zoneIdentifierPresent: zone.zoneIdentifierPresent,
			zoneRemoved: zone.removed,
		};
	});

	secureHandle("shadowquill:storage:getItem", (_, key) => {
		return loadStorageData()[key] ?? null;
	});

	secureHandle("shadowquill:storage:setItem", (_, key, value) => {
		const data = loadStorageData();
		data[key] = value;
		return saveStorageData(data);
	});

	secureHandle("shadowquill:storage:removeItem", (_, key) => {
		const data = loadStorageData();
		delete data[key];
		return saveStorageData(data);
	});

	secureHandle("shadowquill:storage:clear", () => {
		return saveStorageData({});
	});

	secureHandle("shadowquill:storage:getAll", () => {
		return loadStorageData();
	});
}

module.exports = { registerDataIPCHandlers, setHttpServer, getHttpServer };
