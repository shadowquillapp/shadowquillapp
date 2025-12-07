const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shadowquill", {
	getEnvSafety: () => ipcRenderer.invoke("shadowquill:getEnvSafety"),
	restartApp: () => ipcRenderer.invoke("shadowquill:restartApp"),
	getDataPaths: () => ipcRenderer.invoke("shadowquill:getDataPaths"),
	factoryReset: () => ipcRenderer.invoke("shadowquill:factoryReset"),
	checkOllamaInstalled: () =>
		ipcRenderer.invoke("shadowquill:checkOllamaInstalled"),
	openOllama: () => ipcRenderer.invoke("shadowquill:openOllama"),
	getPlatform: () => ipcRenderer.invoke("shadowquill:getPlatform"),
	getSystemSpecs: () => ipcRenderer.invoke("shadowquill:getSystemSpecs"),
	storage: {
		getItem: (key) => ipcRenderer.invoke("shadowquill:storage:getItem", key),
		setItem: (key, value) =>
			ipcRenderer.invoke("shadowquill:storage:setItem", key, value),
		removeItem: (key) =>
			ipcRenderer.invoke("shadowquill:storage:removeItem", key),
		clear: () => ipcRenderer.invoke("shadowquill:storage:clear"),
		getAll: () => ipcRenderer.invoke("shadowquill:storage:getAll"),
	},
	window: {
		minimize: () => ipcRenderer.invoke("shadowquill:window:minimize"),
		maximizeToggle: () =>
			ipcRenderer.invoke("shadowquill:window:maximizeToggle"),
		close: () => ipcRenderer.invoke("shadowquill:window:close"),
		getSize: () => ipcRenderer.invoke("shadowquill:window:getSize"),
	},
	view: {
		getZoomFactor: () => ipcRenderer.invoke("shadowquill:view:getZoomFactor"),
		setZoomFactor: (factor) =>
			ipcRenderer.invoke("shadowquill:view:setZoomFactor", factor),
		resetZoom: () => ipcRenderer.invoke("shadowquill:view:resetZoom"),
		onZoomChanged: (callback) => {
			ipcRenderer.on("shadowquill:zoom:changed", callback);
			return () =>
				ipcRenderer.removeListener("shadowquill:zoom:changed", callback);
		},
	},
	find: {
		findInPage: (text, options) =>
			ipcRenderer.invoke("shadowquill:find:findInPage", text, options),
		stopFindInPage: (action) =>
			ipcRenderer.invoke("shadowquill:find:stopFindInPage", action),
		onShow: (callback) => {
			ipcRenderer.on("shadowquill:find:show", callback);
			return () =>
				ipcRenderer.removeListener("shadowquill:find:show", callback);
		},
		onNext: (callback) => {
			ipcRenderer.on("shadowquill:find:next", callback);
			return () =>
				ipcRenderer.removeListener("shadowquill:find:next", callback);
		},
		onPrevious: (callback) => {
			ipcRenderer.on("shadowquill:find:previous", callback);
			return () =>
				ipcRenderer.removeListener("shadowquill:find:previous", callback);
		},
	},
});

try {
	ipcRenderer.on("shadowquill:info", (_event, payload) => {
		try {
			window.dispatchEvent(
				new CustomEvent("app-info", { detail: payload || {} }),
			);
		} catch (_) {
			/* ignore */
		}
	});
} catch (_) {
	/* ignore */
}
