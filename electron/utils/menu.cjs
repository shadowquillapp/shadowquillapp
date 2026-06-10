const { app, Menu, BrowserWindow } = require("electron");

function sendToFocused(channel, ...args) {
	const win = BrowserWindow.getFocusedWindow();
	if (win) win.webContents.send(channel, ...args);
}

function zoomFocused(compute) {
	const win = BrowserWindow.getFocusedWindow();
	if (!win) return;
	const factor = compute(win.webContents.getZoomFactor());
	win.webContents.setZoomFactor(factor);
	win.webContents.send("shadowquill:zoom:changed", factor);
}

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
					click: () => sendToFocused("shadowquill:find:show"),
				},
				{
					label: "Find Next",
					accelerator: "CmdOrCtrl+G",
					click: () => sendToFocused("shadowquill:find:next"),
				},
				{
					label: "Find Previous",
					accelerator: "Shift+CmdOrCtrl+G",
					click: () => sendToFocused("shadowquill:find:previous"),
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
					click: () => zoomFocused(() => 1.0),
				},
				{
					label: "Zoom In",
					accelerator: "CmdOrCtrl+=",
					click: () => zoomFocused((current) => Math.min(1.5, current + 0.1)),
				},
				{
					label: "Zoom Out",
					accelerator: "CmdOrCtrl+-",
					click: () => zoomFocused((current) => Math.max(0.8, current - 0.1)),
				},
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},
	);

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { createApplicationMenu };
