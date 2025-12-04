// IPC handlers for Ollama integration
const path = require("node:path");
const fs = require("node:fs");
const { ipcMain } = require("electron");

ipcMain.handle("shadowquill:checkOllamaInstalled", async () => {
	try {
		if (process.platform === "darwin") {
			const { execSync } = require("node:child_process");
			try {
				execSync(
					'mdfind "kMDItemKind == Application && kMDItemFSName == Ollama.app"',
					{ timeout: 3000 },
				);
				return { installed: true };
			} catch (_) {
				return { installed: false };
			}
		} else if (process.platform === "win32") {
			const possiblePaths = [
				path.join(
					process.env.LOCALAPPDATA || "",
					"Programs",
					"Ollama",
					"ollama app.exe",
				),
				path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama app.exe"),
			];

			for (const ollamaPath of possiblePaths) {
				if (fs.existsSync(ollamaPath)) {
					return { installed: true };
				}
			}
			return { installed: false };
		} else {
			const { execSync } = require("node:child_process");
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
		}
	} catch (e) {
		return { installed: false };
	}
});

ipcMain.handle("shadowquill:openOllama", async () => {
	try {
		const { spawn } = require("node:child_process");

		if (process.platform === "darwin") {
			spawn("open", ["-a", "Ollama"]);
			return { ok: true };
		}
		if (process.platform === "win32") {
			const possiblePaths = [
				path.join(
					process.env.LOCALAPPDATA || "",
					"Programs",
					"Ollama",
					"ollama app.exe",
				),
				path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama app.exe"),
				"ollama",
			];

			let launched = false;
			for (const ollamaPath of possiblePaths) {
				try {
					if (ollamaPath !== "ollama" && !fs.existsSync(ollamaPath)) continue;
					spawn(ollamaPath, [], { detached: true, stdio: "ignore" });
					launched = true;
					break;
				} catch (_) {}
			}

			if (!launched) {
				return {
					ok: false,
					error: "Ollama not found. Please install from https://ollama.com",
				};
			}
			return { ok: true };
		}

		try {
			spawn("systemctl", ["--user", "start", "ollama"], {
				detached: true,
				stdio: "ignore",
			});
			return { ok: true };
		} catch (_) {
			try {
				spawn("ollama", ["serve"], { detached: true, stdio: "ignore" });
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
