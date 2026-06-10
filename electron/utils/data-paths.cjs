const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { app } = require("electron");

function resolveRootsFromHome(homeDir) {
	if (process.platform === "win32") {
		const localBase = process.env.LOCALAPPDATA?.trim().length
			? process.env.LOCALAPPDATA
			: path.join(homeDir, "AppData", "Local");
		return {
			appDataRoot: localBase,
			userDataDir: path.join(localBase, "ShadowQuill"),
		};
	}

	const appDataRoot =
		process.platform === "darwin"
			? path.join(homeDir, "Library", "Application Support")
			: path.join(homeDir, ".local", "share");
	return {
		appDataRoot,
		userDataDir: path.join(appDataRoot, "ShadowQuill"),
	};
}

/** Safe to call before app is ready. */
function resolveLocalOnlyDataRootsFromEnv() {
	const homeDir =
		process.platform === "win32"
			? process.env.USERPROFILE || process.env.HOME || ""
			: process.env.HOME || "";
	return resolveRootsFromHome(homeDir);
}

/** Must be called after app is ready. */
function resolveLocalOnlyDataRoots() {
	return resolveRootsFromHome(app.getPath("home"));
}

function setupDataPaths() {
	try {
		const { appDataRoot, userDataDir } = resolveLocalOnlyDataRoots();
		try {
			fs.mkdirSync(userDataDir, { recursive: true });
		} catch (_) {}
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
		// Busy-wait so the previous instance fully releases file locks before the wipe.
		const end = Date.now() + 2500;
		while (Date.now() < end) {
			/* busy wait */
		}

		if (fs.existsSync(userDataDir)) {
			const trashPath = `${userDataDir}-trash-${Date.now()}`;
			try {
				fs.renameSync(userDataDir, trashPath);
				fs.rmSync(trashPath, { recursive: true, force: true });
			} catch (e) {
				console.warn(
					"[Factory Reset] Rename failed, trying direct delete:",
					e.message,
				);
				fs.rmSync(userDataDir, { recursive: true, force: true });
			}
		}
		wipeSuccess = true;
		console.log("[Factory Reset] Data wiped successfully.");
	} catch (e) {
		console.error("[Factory Reset] Wipe failed:", e);
	}

	if (wipeSuccess) {
		console.log("[Factory Reset] Spawning fresh app instance...");
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
	if (process.platform !== "win32")
		return { zoneIdentifierPresent: false, removed: false };
	const adsPath = `${process.execPath}:Zone.Identifier`;
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
