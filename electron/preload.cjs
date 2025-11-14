// Preload script: expose limited IPC for selecting data directory.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptcrafter', {
	getEnvSafety: () => ipcRenderer.invoke('promptcrafter:getEnvSafety')
	,
	restartApp: () => ipcRenderer.invoke('promptcrafter:restartApp')
	,
	getDataPaths: () => ipcRenderer.invoke('promptcrafter:getDataPaths')
	,
	factoryReset: () => ipcRenderer.invoke('promptcrafter:factoryReset')
	,
	window: {
		minimize: () => ipcRenderer.invoke('promptcrafter:window:minimize'),
		maximizeToggle: () => ipcRenderer.invoke('promptcrafter:window:maximizeToggle'),
		close: () => ipcRenderer.invoke('promptcrafter:window:close')
	}
});

// Forward info notifications from main to renderer UI to show in-app dialogs
try {
	ipcRenderer.on('promptcrafter:info', (_event, payload) => {
		try {
			window.dispatchEvent(new CustomEvent('app-info', { detail: payload || {} }));
		} catch (_) { /* ignore */ }
	});
} catch (_) { /* ignore */ }
