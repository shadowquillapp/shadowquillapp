const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { dialog, app } = require("electron");

let nextServerPort = null;
let httpServer = null;

async function startNextServer() {
	process.env.ELECTRON = "1";
	process.env.NODE_ENV = "production";

	const appDir = path.join(__dirname, "..", "..");
	let nextAppDir = appDir;

	try {
		console.log(
			"[Electron] Starting embedded Next.js server (packaged). __dirname=",
			__dirname,
			"node",
			process.version,
			"platform",
			process.platform,
			"electron",
			process.versions.electron,
		);

		const resourcesDir =
			process.resourcesPath || path.join(__dirname, "..", "..");
		const unpackedDir = path.join(resourcesDir, "app.asar.unpacked");
		const candidateDirs = [unpackedDir, appDir];
		nextAppDir =
			candidateDirs.find((d) => {
				try {
					return fs.existsSync(path.join(d, ".next"));
				} catch (_) {
					return false;
				}
			}) || appDir;

		const nextDir = path.join(nextAppDir, ".next");
		if (!fs.existsSync(nextDir)) {
			console.warn("[Electron] .next directory missing at", nextDir);
		} else {
			try {
				const files = fs.readdirSync(nextDir).slice(0, 20);
				console.log("[Electron] .next contents sample:", files);
			} catch (e) {
				console.warn("[Electron] Could not list .next contents", e);
			}
		}

		try {
			process.chdir(nextAppDir);
		} catch (_) {}

		let nextFactory = null;
		const nextCandidates = [
			path.join(
				unpackedDir,
				"node_modules",
				"next",
				"dist",
				"server",
				"next.js",
			),
			path.join(
				nextAppDir,
				"node_modules",
				"next",
				"dist",
				"server",
				"next.js",
			),
		];

		for (const p of nextCandidates) {
			try {
				if (fs.existsSync(p)) {
					const mod = require(p);
					nextFactory =
						typeof mod === "function"
							? mod
							: typeof mod.default === "function"
								? mod.default
								: mod.next || mod.default?.next;
					break;
				}
			} catch (_) {
				/* ignore */
			}
		}

		if (!nextFactory) {
			try {
				nextFactory = require("next");
			} catch (eReq) {
				console.error(
					'[Electron] Failed to require("next") direct, attempting dist path',
					eReq?.stack || eReq,
				);
				try {
					const alt = require("next/dist/server/next");
					nextFactory =
						typeof alt === "function"
							? alt
							: typeof alt.default === "function"
								? alt.default
								: alt.next || alt.default?.next;
				} catch (eAlt) {
					console.error(
						"[Electron] Secondary require attempt failed",
						eAlt?.stack || eAlt,
					);
					throw eReq;
				}
			}
		}

		if (typeof nextFactory !== "function") {
			throw new Error(
				`Resolved Next factory is not a function: type=${typeof nextFactory}`,
			);
		}

		const nextApp = nextFactory({ dev: false, dir: nextAppDir });
		await nextApp.prepare();
		console.log("[Electron] Next.js prepared. Creating production server...");
		const handle = nextApp.getRequestHandler();
		httpServer = http.createServer((req, res) => handle(req, res));
		await new Promise((resolve) =>
			httpServer.listen(0, () => resolve(undefined)),
		);
		const addr = httpServer.address();
		console.log("[Electron] Server listening on", addr);
		if (
			addr &&
			typeof addr === "object" &&
			typeof addr.port === "number" &&
			Number.isFinite(addr.port)
		) {
			nextServerPort = addr.port;
		} else {
			throw new Error(`Server address is invalid: ${JSON.stringify(addr)}`);
		}

		if (!nextServerPort) {
			throw new Error("Failed to determine server port after startup");
		}

		return { port: nextServerPort, server: httpServer };
	} catch (e) {
		console.error("Failed to start embedded Next.js server", e?.stack || e);
		let wrote = false;
		try {
			const errPath = path.join(app.getPath("userData"), "startup-error.log");
			fs.mkdirSync(app.getPath("userData"), { recursive: true });
			fs.writeFileSync(errPath, `Error starting server:\n${e?.stack || e}`);
			wrote = true;
		} catch (_) {
			/* ignore */
		}

		try {
			const htmlCandidates = [
				path.join(
					nextAppDir,
					".next",
					"server",
					"app",
					"workbench",
					"index.html",
				),
				path.join(nextAppDir, ".next", "server", "app", "index.html"),
			];
			const fallbackHtml = htmlCandidates.find((p) => {
				try {
					return fs.existsSync(p);
				} catch (_) {
					return false;
				}
			});
			if (fallbackHtml) {
				console.log("[Electron] Using static fallback HTML");
				httpServer = http.createServer((_req, res) => {
					fs.createReadStream(fallbackHtml).pipe(res);
				});
				await new Promise((r) => httpServer.listen(0, () => r(undefined)));
				const addr = httpServer.address();
				if (
					addr &&
					typeof addr === "object" &&
					typeof addr.port === "number" &&
					Number.isFinite(addr.port)
				) {
					nextServerPort = addr.port;
				} else {
					throw new Error(
						`Fallback server address is invalid: ${JSON.stringify(addr)}`,
					);
				}

				if (!nextServerPort) {
					throw new Error(
						"Failed to determine fallback server port after startup",
					);
				}

				return { port: nextServerPort, server: httpServer };
			}
		} catch (e2) {
			console.error("Static fallback failed", e2);
		}

		dialog.showErrorBox(
			"Startup Error",
			`Failed to start internal server. ${wrote ? "See startup-error.log in app data." : ""}`,
		);
		app.quit();
		return null;
	}
}

function getServerPort() {
	return nextServerPort;
}

module.exports = { startNextServer, getServerPort };
