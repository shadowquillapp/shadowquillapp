// Data path resolution and factory reset utilities
const path = require("node:path");
const fs = require("node:fs");
const { app } = require("electron");

/**
 * Resolve data roots using environment variables (safe to call before app is ready)
 */
function resolveLocalOnlyDataRootsFromEnv() {
	let homeDir;
	if (process.platform === "win32") {
		homeDir = process.env.USERPROFILE || process.env.HOME || "";
	} else {
		homeDir = process.env.HOME || "";
	}

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

	const appDataRoot = path.join(homeDir, ".local", "share");
	return {
		appDataRoot,
		userDataDir: path.join(appDataRoot, "ShadowQuill"),
	};
}

/**
 * Resolve data roots using app.getPath (must be called after app is ready)
 */
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

	const appDataRoot = path.join(homeDir, ".local", "share");
	return {
		appDataRoot,
		userDataDir: path.join(appDataRoot, "ShadowQuill"),
	};
}

function setupDataPaths() {
	try {
		const { appDataRoot, userDataDir } = resolveLocalOnlyDataRoots();
		try {
			fs.mkdirSync(userDataDir, { recursive: true });
		} catch (_) {
			/* rip */
		}
		app.setPath("appData", appDataRoot);
		app.setPath("userData", userDataDir);
		process.env.SHADOWQUILL_USER_DATA = userDataDir;
		return { appDataRoot, userDataDir };
	} catch (_) {
		return null;
	}
}

function handleFactoryResetFlag(userDataDir) {
	if (!process.argv.includes("--factory-reset")) return false;

	console.log("[Factory Reset] Clean start detected. Wiping user data...");
	let wipeSuccess = false;
	try {
		const end = Date.now() + 2500;
		while (Date.now() < end) {
			/* busy wait */
		}

		if (fs.existsSync(userDataDir)) {
			const trashPath = `${userDataDir}-trash-${Date.now()}`;
			try {
				fs.renameSync(userDataDir, trashPath);
				fs.rmSync(trashPath, { recursive: true, force: true });
				wipeSuccess = true;
			} catch (e) {
				console.warn(
					"[Factory Reset] Rename failed, trying direct delete:",
					e.message,
				);
				fs.rmSync(userDataDir, { recursive: true, force: true });
				wipeSuccess = true;
			}
		} else {
			wipeSuccess = true;
		}
		console.log("[Factory Reset] Data wiped successfully.");
	} catch (e) {
		console.error("[Factory Reset] Wipe failed:", e);
	}

	if (wipeSuccess) {
		console.log("[Factory Reset] Spawning fresh app instance...");
		const { spawn } = require("node:child_process");
		const argsWithoutReset = process.argv
			.slice(1)
			.filter((arg) => arg !== "--factory-reset");
		spawn(process.execPath, argsWithoutReset, {
			detached: true,
			stdio: "ignore",
			env: { ...process.env },
		}).unref();
	}
	process.exit(0);
	return true;
}

function checkAndOptionallyClearZoneIdentifier() {
	const execPath = process.execPath;
	if (process.platform !== "win32")
		return { zoneIdentifierPresent: false, removed: false };
	const adsPath = `${execPath}:Zone.Identifier`;
	try {
		if (fs.existsSync(adsPath)) {
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

module.exports = {
	resolveLocalOnlyDataRoots,
	resolveLocalOnlyDataRootsFromEnv,
	setupDataPaths,
	handleFactoryResetFlag,
	checkAndOptionallyClearZoneIdentifier,
};
