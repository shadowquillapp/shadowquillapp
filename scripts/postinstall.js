import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { homedir, platform } from "node:os";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

function verifyElectronInstallation() {
	try {
		const electronPath = path.join(__dirname, "..", "node_modules", "electron");
		if (!fs.existsSync(electronPath)) {
			return false;
		}
		const electron = require("electron");
		if (typeof electron === "string") {
			return fs.existsSync(electron);
		}
		return false;
	} catch (_error) {
		return false;
	}
}

function resolveElectronDir() {
	const projectRoot = path.join(__dirname, "..");
	const electronPath = path.join(projectRoot, "node_modules", "electron");
	const pnpmStorePath = path.join(projectRoot, "node_modules", ".pnpm");

	if (fs.existsSync(electronPath)) {
		return electronPath;
	}
	if (fs.existsSync(pnpmStorePath)) {
		try {
			const entries = fs.readdirSync(pnpmStorePath);
			const electronEntry = entries.find((entry) =>
				entry.startsWith("electron@"),
			);
			if (electronEntry) {
				const candidatePath = path.join(
					pnpmStorePath,
					electronEntry,
					"node_modules",
					"electron",
				);
				if (fs.existsSync(candidatePath)) {
					return candidatePath;
				}
			}
		} catch {}
	}

	return null;
}

function getElectronPlatformPath() {
	switch (platform()) {
		case "darwin":
			return "Electron.app/Contents/MacOS/Electron";
		case "win32":
			return "electron.exe";
		default:
			return "electron";
	}
}

function findCachedElectronZip(version) {
	const cacheRoot =
		process.env.electron_config_cache ||
		path.join(homedir(), ".cache", "electron");
	if (!fs.existsSync(cacheRoot)) {
		return null;
	}

	const zipSuffix = `electron-v${version}-${platform()}-${process.arch}.zip`;
	for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}
		const zipPath = path.join(cacheRoot, entry.name, zipSuffix);
		if (fs.existsSync(zipPath)) {
			return zipPath;
		}
	}

	return null;
}

function extractElectronFromCache(electronDir) {
	const distPath = path.join(electronDir, "dist");
	const platformPath = getElectronPlatformPath();
	const binaryPath = path.join(distPath, platformPath);
	if (fs.existsSync(binaryPath)) {
		return true;
	}

	const { version } = JSON.parse(
		fs.readFileSync(path.join(electronDir, "package.json"), "utf8"),
	);
	const zipPath = findCachedElectronZip(version);
	if (!zipPath) {
		return false;
	}

	try {
		console.log("[postinstall] Extracting Electron from cache with unzip...");
		fs.mkdirSync(distPath, { recursive: true });
		execSync(`unzip -oq "${zipPath}" -d "${distPath}"`, {
			stdio: "inherit",
		});
		fs.writeFileSync(path.join(electronDir, "path.txt"), platformPath);
		return fs.existsSync(binaryPath);
	} catch (error) {
		console.warn(
			"[postinstall] Failed to extract Electron from cache:",
			error.message,
		);
		return false;
	}
}

function runElectronInstallScript() {
	const isWindows = platform() === "win32";
	const projectRoot = path.join(__dirname, "..");
	const electronDir = resolveElectronDir();

	if (!electronDir) {
		return false;
	}

	const installScript = path.join(electronDir, "install.js");

	if (fs.existsSync(installScript)) {
		try {
			console.log("[postinstall] Running Electron's install script...");
			execSync(`node "${installScript}"`, {
				stdio: "inherit",
				cwd: projectRoot,
				shell: isWindows,
				env: { ...process.env },
			});
			return true;
		} catch (error) {
			console.warn(
				"[postinstall] Failed to run Electron install script:",
				error.message,
			);
			return false;
		}
	}

	return false;
}

const isWindows = platform() === "win32";
const projectRoot = path.join(__dirname, "..");

try {
	const electronInstalled = verifyElectronInstallation();
	if (!electronInstalled) {
		console.log("[postinstall] Electron not properly installed, fixing...");
		let installScriptRan = runElectronInstallScript();
		if (!verifyElectronInstallation()) {
			installScriptRan =
				extractElectronFromCache(resolveElectronDir()) || installScriptRan;
		}
		if (!verifyElectronInstallation()) {
			try {
				console.log("[postinstall] Running pnpm rebuild electron...");
				execSync("pnpm rebuild electron", {
					stdio: "inherit",
					cwd: projectRoot,
					shell: isWindows,
				});
			} catch (_rebuildError) {
				console.log("[postinstall] Rebuild failed, trying full reinstall...");
				execSync("pnpm install electron --force", {
					stdio: "inherit",
					cwd: projectRoot,
					shell: isWindows,
				});
				runElectronInstallScript();
				extractElectronFromCache(resolveElectronDir());
			}
		}
		const verified = verifyElectronInstallation();
		if (verified) {
			console.log("[postinstall] Electron installed successfully!");
		} else {
			console.warn(
				"[postinstall] Electron installation fix attempted but verification still failed.",
			);
			console.warn(
				"[postinstall] You may need to manually run: pnpm exec electron",
			);
		}
	} else {
		console.log("[postinstall] Electron installation verified!");
	}
} catch (error) {
	console.warn("[postinstall] Failed to verify/fix Electron:", error.message);
	console.warn(
		"[postinstall] You may need to manually run: pnpm exec electron",
	);
}

const nextDir = path.join(__dirname, "..", ".next");

if (!fs.existsSync(nextDir)) {
	console.log(
		"[postinstall] .next directory not found, attempting to build...",
	);
	try {
		const packageJsonPath = path.join(__dirname, "..", "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
		const hasBuildScript = packageJson.scripts?.["build:electron"];

		if (hasBuildScript) {
			const isWindows = platform() === "win32";
			execSync("pnpm run build:electron", {
				stdio: "inherit",
				cwd: path.join(__dirname, ".."),
				shell: isWindows,
			});
			console.log("[postinstall] Build complete!");
		} else {
			console.warn(
				"[postinstall] Build script not found. The package should include a pre-built .next directory.",
			);
		}
	} catch (error) {
		console.warn(
			"[postinstall] Build failed (this is OK if the package includes a pre-built .next directory):",
			error.message,
		);
		console.warn(
			"[postinstall] If the app fails to start, you may need to run: pnpm run build:electron",
		);
	}
} else {
	console.log("[postinstall] .next directory found, ready to start!");
}
