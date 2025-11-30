#!/usr/bin/env node
// Silent wrapper for npm start
const { spawn } = require("node:child_process");
const path = require("node:path");

const env = {
	...process.env,
	SUPPRESS_SUPPORT_NOTES: "1",
	SKIP_ENV_VALIDATION: "true",
	ELECTRON: "1",
	NEXT_PUBLIC_ELECTRON: "1",
};

const proc = spawn(
	process.execPath,
	[path.join(__dirname, "electron", "start-electron.cjs"), "--prod"],
	{
		stdio: "inherit",
		env,
	},
);

proc.on("exit", (code) => {
	process.exit(code ?? 0);
});

process.on("SIGINT", () => {
	proc.kill("SIGINT");
});

process.on("SIGTERM", () => {
	proc.kill("SIGTERM");
});
