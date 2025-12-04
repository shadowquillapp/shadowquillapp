#!/usr/bin/env node
// @ts-nocheck
// Starts Next.js dev (or prod) then launches Electron.
const { spawn } = require("node:child_process");
const path = require("node:path");
const { URL } = require("node:url");
const isProd = process.argv.includes("--prod");
let nextDevServer = null;
let prodServer = null;

/**
 * Helper to check if dev server is ready
 * @param {any} http
 * @param {number} start
 * @param {number} timeoutMs
 * @param {() => void} resolve
 * @param {(err: Error) => void} reject
 */
function checkDevServerReady(http, start, timeoutMs, resolve, reject) {
	const url = new URL("http://localhost:31415");
	const req = http.get(url, (res) => {
		res.destroy();
		resolve();
	});
	req.on("error", () => {
		if (Date.now() - start > timeoutMs) {
			return reject(new Error("Dev server did not start within timeout"));
		}
		setTimeout(
			() => checkDevServerReady(http, start, timeoutMs, resolve, reject),
			600,
		);
	});
}

/** Start Next.js (dev or prod) without relying on spawning npm directly. */
/** @returns {Promise<void>} */
function startNext() {
	return new Promise((resolve, reject) => {
		const env = {
			...process.env,
			ELECTRON: "1",
			NEXT_PUBLIC_ELECTRON: "1",
			BROWSER: "none",
		};
		if (!isProd) {
			let nextBin;
			try {
				nextBin = require.resolve("next/dist/bin/next");
			} catch (e) {
				const err = /** @type {any} */ (e);
				return reject(new Error(`Cannot resolve next binary: ${err.message}`));
			}
			nextDevServer = spawn(
				process.execPath,
				[nextBin, "dev", "--turbo", "-H", "localhost", "-p", "31415"],
				{
					stdio: "inherit",
					env,
				},
			);
			nextDevServer.on("error", reject);
			const http = require("node:http");
			const start = Date.now();
			const timeoutMs = 25000;
			nextDevServer.once("spawn", () => {
				setTimeout(
					() => checkDevServerReady(http, start, timeoutMs, resolve, reject),
					1200,
				);
			});
		} else {
			(async () => {
				try {
					let nextFactory;
					try {
						const nextModule = require("next");
						nextFactory =
							typeof nextModule === "function"
								? nextModule
								: nextModule.default;
					} catch (e) {
						return reject(new Error(`Failed to load Next.js: ${e.message}`));
					}

					if (typeof nextFactory !== "function") {
						return reject(new Error("Next.js factory is not a function"));
					}

					const appDir = path.join(__dirname, "..");
					const nextApp = nextFactory({
						dev: false,
						dir: appDir,
						hostname: "localhost",
						port: 31415,
					});

					await nextApp.prepare();

					const http = require("node:http");
					const handle = nextApp.getRequestHandler();

					prodServer = http.createServer((req, res) => {
						handle(req, res).catch((err) => {
							console.error("Error handling request:", err);
							res.statusCode = 500;
							res.end("Internal Server Error");
						});
					});

					await new Promise((r, rej) => {
						prodServer.listen(31415, "127.0.0.1", (err) => {
							if (err) return rej(err);
							console.log(
								"[start-electron] Production server listening on http://localhost:31415",
							);
							r(undefined);
						});
					});

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

	if (nextDevServer && !nextDevServer.killed) {
		console.log("[start-electron] Killing Next.js dev server...");
		try {
			nextDevServer.kill("SIGTERM");
			setTimeout(() => {
				if (nextDevServer && !nextDevServer.killed) {
					nextDevServer.kill("SIGKILL");
				}
			}, 2000);
		} catch (e) {
			console.error("[start-electron] Error killing Next.js dev server:", e);
		}
	}

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

		proc.on("exit", (code) => {
			cleanup();
			process.exit(code ?? 0);
		});
		process.on("SIGINT", () => {
			cleanup();
			process.exit(0);
		});
		process.on("SIGTERM", () => {
			cleanup();
			process.exit(0);
		});
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
