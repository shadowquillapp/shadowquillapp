#!/usr/bin/env node
// @ts-nocheck
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const { URL } = require("node:url");
const isProd = process.argv.includes("--prod");
let nextDevServer = null;
let prodServer = null;

function checkDevServerReady(start, timeoutMs, resolve, reject) {
	const req = http.get(new URL("http://localhost:31415"), (res) => {
		res.destroy();
		resolve();
	});
	req.on("error", () => {
		if (Date.now() - start > timeoutMs) {
			return reject(new Error("Dev server did not start within timeout"));
		}
		setTimeout(
			() => checkDevServerReady(start, timeoutMs, resolve, reject),
			600,
		);
	});
}

/** Start Next.js (dev or prod) without relying on spawning npm directly. */
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
				return reject(new Error(`Cannot resolve next binary: ${e.message}`));
			}
			nextDevServer = spawn(
				process.execPath,
				[nextBin, "dev", "--turbo", "-H", "localhost", "-p", "31415"],
				{ stdio: "inherit", env },
			);
			nextDevServer.on("error", reject);
			const start = Date.now();
			nextDevServer.once("spawn", () => {
				setTimeout(
					() => checkDevServerReady(start, 25000, resolve, reject),
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

					const nextApp = nextFactory({
						dev: false,
						dir: path.join(__dirname, ".."),
						hostname: "localhost",
						port: 31415,
					});
					await nextApp.prepare();
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
								"[start-electron] Production server listening on http://127.0.0.1:31415",
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

function cleanup() {
	console.log("[start-electron] Cleaning up...");

	if (nextDevServer && !nextDevServer.killed) {
		console.log("[start-electron] Killing Next.js dev server...");
		try {
			if (process.platform === "win32") {
				if (nextDevServer.pid) {
					spawnSync(
						"taskkill",
						["/PID", String(nextDevServer.pid), "/T", "/F"],
						{
							stdio: "ignore",
						},
					);
				}
			} else {
				nextDevServer.kill("SIGTERM");
				setTimeout(() => {
					if (nextDevServer && !nextDevServer.killed) {
						nextDevServer.kill("SIGKILL");
					}
				}, 2000);
			}
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
		const exitOnSignal = () => {
			cleanup();
			process.exit(0);
		};
		process.on("SIGINT", exitOnSignal);
		process.on("SIGTERM", exitOnSignal);
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
