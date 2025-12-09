import { execSync } from "node:child_process";
import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import { createRequire } from "node:module";

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
	} catch (error) {
		return false;
	}
}

function runElectronInstallScript() {
	const isWindows = platform() === "win32";
	const projectRoot = path.join(__dirname, "..");
	const electronPath = path.join(projectRoot, "node_modules", "electron");
	const pnpmStorePath = path.join(projectRoot, "node_modules", ".pnpm");
	let electronDir = null;
	
	if (fs.existsSync(electronPath)) {
		electronDir = electronPath;
	} else if (fs.existsSync(pnpmStorePath)) {
		try {
			const entries = fs.readdirSync(pnpmStorePath);
			const electronEntry = entries.find((entry) => entry.startsWith("electron@"));
			if (electronEntry) {
				const candidatePath = path.join(
					pnpmStorePath,
					electronEntry,
					"node_modules",
					"electron",
				);
				if (fs.existsSync(candidatePath)) {
					electronDir = candidatePath;
				}
			}
		} catch (error) {
			// rip
		}
	}
	
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
			console.warn("[postinstall] Failed to run Electron install script:", error.message);
			return false;
		}
	}
	
	return false;
}

function ensureElectronInstalled() {
	const isWindows = platform() === "win32";
	const projectRoot = path.join(__dirname, "..");
	
	try {
		const electronInstalled = verifyElectronInstallation();
		if (!electronInstalled) {
			console.log("[postinstall] Electron not properly installed, fixing...");
			const installScriptRan = runElectronInstallScript();
			if (!installScriptRan) {
				try {
					console.log("[postinstall] Running pnpm rebuild electron...");
					execSync("pnpm rebuild electron", {
						stdio: "inherit",
						cwd: projectRoot,
						shell: isWindows,
					});
				} catch (rebuildError) {
					console.log("[postinstall] Rebuild failed, trying full reinstall...");
					execSync("pnpm install electron --force", {
						stdio: "inherit",
						cwd: projectRoot,
						shell: isWindows,
					});
					runElectronInstallScript();
				}
			}
			const verified = verifyElectronInstallation();
			if (verified) {
				console.log("[postinstall] Electron installed successfully!");
			} else {
				console.warn("[postinstall] Electron installation fix attempted but verification still failed.");
				console.warn("[postinstall] You may need to manually run: pnpm exec electron");
			}
		} else {
			console.log("[postinstall] Electron installation verified!");
		}
	} catch (error) {
		console.warn("[postinstall] Failed to verify/fix Electron:", error.message);
		console.warn("[postinstall] You may need to manually run: pnpm exec electron");
	}
}

ensureElectronInstalled();

const nextDir = path.join(__dirname, "..", ".next");

if (!fs.existsSync(nextDir)) {
	console.log(
		"[postinstall] .next directory not found, attempting to build...",
	);
	try {
		// Check if build tools are available
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
			console.warn("[postinstall] Build script not found. The package should include a pre-built .next directory.");
		}
	} catch (error) {
		console.warn("[postinstall] Build failed (this is OK if the package includes a pre-built .next directory):", error.message);
		console.warn("[postinstall] If the app fails to start, you may need to run: pnpm run build:electron");
	}
} else {
	console.log("[postinstall] .next directory found, ready to start!");
}
