#!/usr/bin/env node
// @ts-nocheck
// Starts Next.js dev (or prod) then launches Electron.
const { spawn } = require("node:child_process");
const path = require("node:path");

const isProd = process.argv.includes("--prod");

// Store references to child processes for cleanup
let nextDevServer = null;
let prodServer = null;

/** Start Next.js (dev or prod) without relying on spawning npm directly. */
/** @returns {Promise<void>} */
function startNext() {
	return new Promise((resolve, reject) => {
		const env = { ...process.env, ELECTRON: "1", NEXT_PUBLIC_ELECTRON: "1" };
		if (!isProd) {
			// Dev: run `next dev --turbo` via Node directly.
			let nextBin;
			try {
				nextBin = require.resolve("next/dist/bin/next");
			} catch (e) {
				const err = /** @type {any} */ (e);
				return reject(new Error(`Cannot resolve next binary: ${err.message}`));
			}
			nextDevServer = spawn(process.execPath, [nextBin, "dev", "--turbo"], {
				stdio: "inherit",
				env,
			});
			nextDevServer.on("error", reject);
			const http = require("node:http");
			const start = Date.now();
			const timeoutMs = 25000;
			function check() {
				const req = http.get("http://localhost:3000", (res) => {
					res.destroy();
					resolve(undefined);
				});
				req.on("error", () => {
					if (Date.now() - start > timeoutMs)
						return reject(new Error("Dev server did not start within timeout"));
					setTimeout(check, 600);
				});
			}
			nextDevServer.once("spawn", () => setTimeout(check, 1200));
		} else {
			// Prod: assume `next build` already run; start Next server programmatically.
			(async () => {
				try {
					const nextModule = require("next/dist/server/next");
					const nextApp = nextModule.default({
						dev: false,
						dir: path.join(__dirname, ".."),
					});
					await nextApp.prepare();
					const http = require("node:http");
					const handle = nextApp.getRequestHandler();
					prodServer = http.createServer((req, res) => handle(req, res));
					await new Promise((r, rej) =>
						prodServer
							.listen(3000)
							.once("error", rej)
							.once("listening", () => r(undefined)),
					);
					resolve(undefined);
				} catch (e) {
					reject(e);
				}
			})();
		}
	});
}

/** Cleanup function to kill all child processes and servers */
function cleanup() {
	console.log("[start-electron] Cleaning up...");
	
	// Kill Next.js dev server if running
	if (nextDevServer && !nextDevServer.killed) {
		console.log("[start-electron] Killing Next.js dev server...");
		try {
			nextDevServer.kill("SIGTERM");
			// Force kill if it doesn't stop
			setTimeout(() => {
				if (nextDevServer && !nextDevServer.killed) {
					nextDevServer.kill("SIGKILL");
				}
			}, 2000);
		} catch (e) {
			console.error("[start-electron] Error killing Next.js dev server:", e);
		}
	}
	
	// Close prod server if running
	if (prodServer) {
		console.log("[start-electron] Closing production server...");
		try {
			prodServer.close();
		} catch (e) {
			console.error("[start-electron] Error closing production server:", e);
		}
	}
}

(async () => {
	try {
		await startNext();
		const electronModule = require("electron");
		const electronCmd =
			typeof electronModule === "string" ? electronModule : "electron";
		const proc = spawn(electronCmd, [path.join(__dirname, "main.cjs")], {
			stdio: ["inherit", "inherit", "pipe"],
			env: { ...process.env, ELECTRON: "1", NEXT_PUBLIC_ELECTRON: "1" },
		});

		// Filter out harmless DevTools/Electron noise from stderr
		if (proc.stderr) {
			proc.stderr.on("data", (data) => {
				const str = data.toString();
				if (
					str.includes("Request Autofill.enable failed") ||
					str.includes("Request Autofill.setAddresses failed") ||
					str.includes("Refused to apply style from 'devtools://")
				) {
					return;
				}
				process.stderr.write(data);
			});
		}
		
		// Clean up when Electron exits
		proc.on("exit", (code) => {
			cleanup();
			process.exit(code ?? 0);
		});
		
		// Clean up when this process is killed
		process.on("SIGINT", () => {
			cleanup();
			process.exit(0);
		});
		
		process.on("SIGTERM", () => {
			cleanup();
			process.exit(0);
		});
		
		// Ensure cleanup happens on process exit
		process.on("exit", () => {
			if (nextDevServer && !nextDevServer.killed) {
				nextDevServer.kill("SIGKILL");
			}
		});
	} catch (error) {
		console.error("[start-electron] Error:", error);
		cleanup();
		process.exit(1);
	}
})();
