// Application menu creation
const { app, Menu, BrowserWindow } = require("electron");

function createApplicationMenu() {
	const isMac = process.platform === "darwin";
	/** @type {import('electron').MenuItemConstructorOptions[]} */
	const template = [];

	if (isMac) {
		template.push({
			label: app.name,
			submenu: [
				{ role: "about" },
				{ type: "separator" },
				{ role: "services" },
				{ type: "separator" },
				{ role: "hide" },
				{ role: "hideOthers" },
				{ role: "unhide" },
				{ type: "separator" },
				{ role: "quit" },
			],
		});
	}

	template.push(
		{
			label: "File",
			submenu: isMac ? [{ role: "close" }] : [{ role: "quit" }],
		},
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "pasteAndMatchStyle" },
				{ role: "delete" },
				{ role: "selectAll" },
				{ type: "separator" },
				{
					label: "Find",
					accelerator: "CmdOrCtrl+F",
					click: () => {
						const win = BrowserWindow.getFocusedWindow();
						if (win) {
							win.webContents.send("shadowquill:find:show");
						}
					},
				},
				{
					label: "Find Next",
					accelerator: "CmdOrCtrl+G",
					click: () => {
						const win = BrowserWindow.getFocusedWindow();
						if (win) {
							win.webContents.send("shadowquill:find:next");
						}
					},
				},
				{
					label: "Find Previous",
					accelerator: "Shift+CmdOrCtrl+G",
					click: () => {
						const win = BrowserWindow.getFocusedWindow();
						if (win) {
							win.webContents.send("shadowquill:find:previous");
						}
					},
				},
			],
		},
		{
			label: "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ type: "separator" },
				{
					label: "Reset Zoom",
					accelerator: "CmdOrCtrl+0",
					click: () => {
						const w = BrowserWindow.getFocusedWindow();
						if (w) {
							w.webContents.setZoomFactor(1.15);
							w.webContents.send("shadowquill:zoom:changed", 1.15);
						}
					},
				},
				{
					label: "Zoom In",
					accelerator: "CmdOrCtrl+=",
					click: () => {
						const w = BrowserWindow.getFocusedWindow();
						if (w) {
							const current = w.webContents.getZoomFactor();
							const newZoom = Math.min(1.5, current + 0.1);
							w.webContents.setZoomFactor(newZoom);
							w.webContents.send("shadowquill:zoom:changed", newZoom);
						}
					},
				},
				{
					label: "Zoom Out",
					accelerator: "CmdOrCtrl+-",
					click: () => {
						const w = BrowserWindow.getFocusedWindow();
						if (w) {
							const current = w.webContents.getZoomFactor();
							const newZoom = Math.max(0.8, current - 0.1);
							w.webContents.setZoomFactor(newZoom);
							w.webContents.send("shadowquill:zoom:changed", newZoom);
						}
					},
				},
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
	);

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

module.exports = { createApplicationMenu };
