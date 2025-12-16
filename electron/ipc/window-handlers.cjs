// IPC handlers for window and view controls
const { ipcMain, BrowserWindow, app } = require("electron");

ipcMain.handle("shadowquill:window:minimize", (e) => {
	const w = BrowserWindow.fromWebContents(e.sender);
	if (w) w.minimize();
});

ipcMain.handle("shadowquill:window:maximizeToggle", (e) => {
	const w = BrowserWindow.fromWebContents(e.sender);
	if (!w) return;
	if (w.isMaximized()) w.unmaximize();
	else w.maximize();
});

ipcMain.handle("shadowquill:window:close", () => {
	app.quit();
});

ipcMain.handle("shadowquill:view:getZoomFactor", (e) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return 1;
		return w.webContents.getZoomFactor();
	} catch (_) {
		return 1;
	}
});

ipcMain.handle("shadowquill:view:setZoomFactor", (e, factor) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return { ok: false, error: "No window" };
		let f = Number(factor);
		if (!Number.isFinite(f)) f = 1;
		f = Math.max(0.8, Math.min(1.5, f));
		w.webContents.setZoomFactor(f);
		return { ok: true, zoomFactor: f };
	} catch (err) {
		return { ok: false, error: err?.message || "Failed to set zoom" };
	}
});

ipcMain.handle("shadowquill:view:resetZoom", (e) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return { ok: false, error: "No window" };
		w.webContents.setZoomFactor(1.15);
		return { ok: true, zoomFactor: 1.15 };
	} catch (err) {
		return { ok: false, error: err?.message || "Failed to reset zoom" };
	}
});

ipcMain.handle("shadowquill:window:getSize", (e) => {
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w) return { ok: false, error: "No window" };
		const windowSize = w.getSize();
		const contentSize = w.getContentSize();
		return {
			ok: true,
			windowSize,
			contentSize,
			isMaximized: w.isMaximized(),
			isFullScreen: w.isFullScreen(),
		};
	} catch (err) {
		return { ok: false, error: err?.message || "Failed to get size" };
	}
});
