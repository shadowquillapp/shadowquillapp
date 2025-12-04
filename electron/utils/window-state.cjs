// Window state persistence utilities
const path = require("node:path");
const fs = require("node:fs");
const { app } = require("electron");

const WINDOW_STATE_FILE = "window-state.json";

function getWindowStatePath() {
	try {
		return path.join(app.getPath("userData"), WINDOW_STATE_FILE);
	} catch (_) {
		return null;
	}
}

function loadWindowState() {
	const defaults = {
		width: 1280,
		height: 850,
		x: undefined,
		y: undefined,
		isMaximized: true,
	};
	try {
		const statePath = getWindowStatePath();
		if (!statePath || !fs.existsSync(statePath)) return defaults;
		const data = fs.readFileSync(statePath, "utf8");
		const state = JSON.parse(data);
		if (typeof state.width !== "number" || state.width < 1045)
			state.width = defaults.width;
		if (typeof state.height !== "number" || state.height < 850)
			state.height = defaults.height;
		if (typeof state.x !== "number" || state.x < -100) state.x = undefined;
		if (typeof state.y !== "number" || state.y < -100) state.y = undefined;
		return state;
	} catch (_) {
		return defaults;
	}
}

function saveWindowState(win) {
	try {
		const statePath = getWindowStatePath();
		if (!statePath || !win) return;
		const isMaximized = win.isMaximized();
		const bounds = isMaximized
			? win._lastNormalBounds || win.getBounds()
			: win.getBounds();
		const state = {
			width: bounds.width,
			height: bounds.height,
			x: bounds.x,
			y: bounds.y,
			isMaximized,
		};
		fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
	} catch (_) {}
}

module.exports = { loadWindowState, saveWindowState };
