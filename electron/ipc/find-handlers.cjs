// IPC handlers for find in page
const { ipcMain, BrowserWindow } = require("electron");
const { requireValidIpcSender } = require("../utils/ipc-security.cjs");

ipcMain.handle("shadowquill:find:findInPage", (e, text, options = {}) => {
	requireValidIpcSender(e);
	try {
		const w = BrowserWindow.fromWebContents(e.sender);
		if (!w || !text) return { ok: false };
		const result = w.webContents.findInPage(text, {
			forward: options.forward !== false,
			findNext: options.findNext === true,
			matchCase: options.matchCase === true,
		});
		return { ok: true, requestId: result };
	} catch (err) {
		return { ok: false, error: err?.message };
	}
});

ipcMain.handle(
	"shadowquill:find:stopFindInPage",
	(e, action = "clearSelection") => {
		requireValidIpcSender(e);
		try {
			const w = BrowserWindow.fromWebContents(e.sender);
			if (w) {
				w.webContents.stopFindInPage(action);
			}
			return { ok: true };
		} catch (err) {
			return { ok: false, error: err?.message };
		}
	},
);
