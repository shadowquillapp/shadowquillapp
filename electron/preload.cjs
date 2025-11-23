// Preload script: expose limited IPC for selecting data directory.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shadowquill', {
	getEnvSafety: () => ipcRenderer.invoke('shadowquill:getEnvSafety')
	,
	restartApp: () => ipcRenderer.invoke('shadowquill:restartApp')
	,
	getDataPaths: () => ipcRenderer.invoke('shadowquill:getDataPaths')
	,
	factoryReset: () => ipcRenderer.invoke('shadowquill:factoryReset')
	,
	checkOllamaInstalled: () => ipcRenderer.invoke('shadowquill:checkOllamaInstalled')
	,
	openOllama: () => ipcRenderer.invoke('shadowquill:openOllama')
	,
	window: {
		minimize: () => ipcRenderer.invoke('shadowquill:window:minimize'),
		maximizeToggle: () => ipcRenderer.invoke('shadowquill:window:maximizeToggle'),
		close: () => ipcRenderer.invoke('shadowquill:window:close')
	}
});

// Forward info notifications from main to renderer UI to show in-app dialogs
try {
	ipcRenderer.on('shadowquill:info', (_event, payload) => {
		try {
			window.dispatchEvent(new CustomEvent('app-info', { detail: payload || {} }));
		} catch (_) { /* ignore */ }
	});
} catch (_) { /* ignore */ }
