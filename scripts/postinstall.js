import { execSync } from "node:child_process";
import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
		// Don't exit with error - the package should include pre-built files
	}
} else {
	console.log("[postinstall] .next directory found, ready to start!");
}
