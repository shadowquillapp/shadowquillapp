const path = require("node:path");
const fs = require("node:fs");
const { execSync, spawn } = require("node:child_process");
const { ipcMain } = require("electron");
const { requireValidIpcSender } = require("../utils/ipc-security.cjs");

const WINDOWS_OLLAMA_PATHS = [
	path.join(
		process.env.LOCALAPPDATA || "",
		"Programs",
		"Ollama",
		"ollama app.exe",
	),
	path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama app.exe"),
];

function spawnDetached(command, args = []) {
	const child = spawn(command, args, {
		detached: true,
		stdio: "ignore",
		windowsHide: true,
	});
	child.unref();
	return child;
}

ipcMain.handle("shadowquill:checkOllamaInstalled", async (event) => {
	requireValidIpcSender(event);
	try {
		if (process.platform === "darwin") {
			try {
				execSync(
					'mdfind "kMDItemKind == Application && kMDItemFSName == Ollama.app"',
					{ timeout: 3000 },
				);
				return { installed: true };
			} catch (_) {
				return { installed: false };
			}
		}
		if (process.platform === "win32") {
			return { installed: WINDOWS_OLLAMA_PATHS.some((p) => fs.existsSync(p)) };
		}
		try {
			execSync("which ollama", { timeout: 3000 });
			return { installed: true };
		} catch (_) {
			try {
				execSync("command -v ollama", { timeout: 3000 });
				return { installed: true };
			} catch (_) {
				return { installed: false };
			}
		}
	} catch (_e) {
		return { installed: false };
	}
});

ipcMain.handle("shadowquill:openOllama", async (event) => {
	requireValidIpcSender(event);
	try {
		if (process.platform === "darwin") {
			spawn("open", ["-a", "Ollama"]);
			return { ok: true };
		}
		if (process.platform === "win32") {
			for (const ollamaPath of [...WINDOWS_OLLAMA_PATHS, "ollama"]) {
				try {
					if (ollamaPath !== "ollama" && !fs.existsSync(ollamaPath)) continue;
					spawnDetached(ollamaPath);
					return { ok: true };
				} catch (_) {}
			}
			return {
				ok: false,
				error: "Ollama not found. Please install from https://ollama.com",
			};
		}
		try {
			spawnDetached("systemctl", ["--user", "start", "ollama"]);
			return { ok: true };
		} catch (_) {
			try {
				spawnDetached("ollama", ["serve"]);
				return { ok: true };
			} catch (_) {
				return {
					ok: false,
					error:
						"Could not start Ollama. Please start it manually or install from https://ollama.com",
				};
			}
		}
	} catch (e) {
		return { ok: false, error: e?.message || "Failed to open Ollama" };
	}
});
