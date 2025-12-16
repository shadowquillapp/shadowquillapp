// IPC handlers for platform and system information
const { ipcMain, shell } = require("electron");
const si = require("systeminformation");
const https = require("node:https");
const path = require("node:path");
const fs = require("node:fs");

// Get current version from package.json
let CURRENT_VERSION = "0.8.0";
try {
	const packagePath = path.join(__dirname, "../../package.json");
	const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
	CURRENT_VERSION = packageJson.version;
} catch (e) {
	console.warn("[Electron] Failed to read version from package.json:", e);
}

ipcMain.handle("shadowquill:getPlatform", () => {
	return process.platform;
});

ipcMain.handle("shadowquill:getSystemSpecs", async () => {
	try {
		const [cpu, mem, graphics] = await Promise.all([
			si.cpu(),
			si.mem(),
			si.graphics(),
		]);

		let cpuBrand = cpu.brand;
		cpuBrand = cpuBrand
			.replace(/Gen\s+/i, "")
			.replace(/Intel\s+/i, "")
			.replace(/AMD\s+/i, "")
			.replace(/Core\s+/i, "")
			.replace(/\(R\)/g, "")
			.replace(/\(TM\)/g, "")
			.trim();

		let gpuModel = graphics.controllers[0]?.model || "Unknown GPU";
		gpuModel = gpuModel
			.replace(/NVIDIA\s+/i, "")
			.replace(/GeForce\s+/i, "")
			.replace(/AMD\s+/i, "")
			.replace(/Radeon\s+/i, "")
			.trim();

		return {
			cpu: cpuBrand,
			ram: mem.total,
			gpu: gpuModel,
		};
	} catch (e) {
		console.error("Failed to fetch system specs:", e);
		return { cpu: "Unknown", ram: 0, gpu: "Unknown" };
	}
});

ipcMain.handle("shadowquill:checkForUpdates", async () => {
	return new Promise((resolve) => {
		const options = {
			hostname: "api.github.com",
			path: "/repos/shadowquillapp/shadowquillapp/releases/latest",
			method: "GET",
			headers: {
				"User-Agent": "ShadowQuill-App",
			},
		};

		const req = https.request(options, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					if (res.statusCode !== 200) {
						resolve({
							success: false,
							error: `HTTP ${res.statusCode}`,
						});
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
					resolve({
						success: false,
						error: err.message,
					});
				}
			});
		});

		req.on("error", (err) => {
			resolve({
				success: false,
				error: err.message,
			});
		});

		req.setTimeout(10000, () => {
			req.destroy();
			resolve({
				success: false,
				error: "Request timeout",
			});
		});

		req.end();
	});
});

ipcMain.handle("shadowquill:openExternalUrl", async (_event, url) => {
	try {
		await shell.openExternal(url);
		return { success: true };
	} catch (err) {
		return { success: false, error: err.message };
	}
});

// Helper function to compare version strings
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
