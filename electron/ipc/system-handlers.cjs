const { ipcMain, shell } = require("electron");
const https = require("node:https");
const path = require("node:path");
const fs = require("node:fs");
const { openExternalUrl } = require("../utils/external-url.cjs");
const { requireValidIpcSender } = require("../utils/ipc-security.cjs");

let CURRENT_VERSION = "0.8.0";
try {
	const packagePath = path.join(__dirname, "../../package.json");
	CURRENT_VERSION = JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
} catch (e) {
	console.warn("[Electron] Failed to read version from package.json:", e);
}

function compareVersions(v1, v2) {
	const parts1 = v1.split(".").map(Number);
	const parts2 = v2.split(".").map(Number);
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const part1 = parts1[i] || 0;
		const part2 = parts2[i] || 0;
		if (part1 > part2) return 1;
		if (part1 < part2) return -1;
	}
	return 0;
}

ipcMain.handle("shadowquill:getPlatform", (event) => {
	requireValidIpcSender(event);
	return process.platform;
});

ipcMain.handle("shadowquill:checkForUpdates", async (event) => {
	requireValidIpcSender(event);
	return new Promise((resolve) => {
		const options = {
			hostname: "api.github.com",
			path: "/repos/shadowquillapp/shadowquillapp/releases/latest",
			method: "GET",
			headers: { "User-Agent": "ShadowQuill-App" },
		};

		const req = https.request(options, (res) => {
			let data = "";
			res.on("data", (chunk) => {
				data += chunk;
			});
			res.on("end", () => {
				try {
					if (res.statusCode !== 200) {
						resolve({ success: false, error: `HTTP ${res.statusCode}` });
						return;
					}
					const release = JSON.parse(data);
					const latestVersion = release.tag_name.replace(/^v/, "");
					resolve({
						success: true,
						currentVersion: CURRENT_VERSION,
						latestVersion,
						updateAvailable:
							compareVersions(latestVersion, CURRENT_VERSION) > 0,
						releaseUrl: release.html_url,
						releaseNotes: release.body,
						publishedAt: release.published_at,
					});
				} catch (err) {
					resolve({ success: false, error: err.message });
				}
			});
		});

		req.on("error", (err) => {
			resolve({ success: false, error: err.message });
		});

		req.setTimeout(10000, () => {
			req.destroy();
			resolve({ success: false, error: "Request timeout" });
		});

		req.end();
	});
});

ipcMain.handle("shadowquill:openExternalUrl", async (event, url) => {
	requireValidIpcSender(event);
	try {
		await openExternalUrl(shell, url);
		return { success: true };
	} catch (err) {
		return { success: false, error: err.message };
	}
});
