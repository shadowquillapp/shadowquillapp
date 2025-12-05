const { execSync } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");

const tempBuildDir = path.join(
	os.tmpdir(),
	`nextjs-electron-build-${Date.now()}`,
);

try {
	console.log("Starting Electron build with isolated environment...");

	const env = {
		...process.env,
		NODE_OPTIONS: "--max-old-space-size=4096 --no-deprecation",
		SKIP_ENV_VALIDATION: "true",
		ELECTRON: "1",
		NEXT_PUBLIC_ELECTRON: "1",
		BUILDING_ELECTRON: "1",
		TMPDIR: tempBuildDir,
		TEMP: tempBuildDir,
		TMP: tempBuildDir,
		NEXT_TELEMETRY_DISABLED: "1",
		TAILWIND_MODE: "build",
		TAILWIND_DISABLE_TOUCH: "1",
		HOME: tempBuildDir,
		USERPROFILE: tempBuildDir,
		APPDATA: path.join(tempBuildDir, "AppData", "Roaming"),
		LOCALAPPDATA: path.join(tempBuildDir, "AppData", "Local"),
	};

	console.log("Building Next.js app (electron build phase)...");
	execSync("next build --webpack", {
		stdio: "inherit",
		env,
		cwd: process.cwd(),
	});
	console.log(
		"Next.js build finished. Listing .next root contents for diagnostics:",
	);
	try {
		execSync("ls -1 .next | head -n 40", { stdio: "inherit" });
	} catch {}

	console.log("Build completed successfully!");
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error("Build failed:", message);
	process.exit(1);
}
