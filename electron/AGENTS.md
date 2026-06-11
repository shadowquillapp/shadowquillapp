# `electron/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** Electron main process, IPC contract, security boundaries, Next.js server lifecycle.

## File map

### Entry / build

| File | Role |
|---|---|
| `main.cjs` | Electron main: app lifecycle, registers all IPC, creates window, starts Next server, handles quit/cleanup. |
| `preload.cjs` | Context-isolated bridge: `window.shadowquill.*` via `contextBridge` + `ipcRenderer`. **Only** surface exposed to the renderer. |
| `start-electron.cjs` | Dev launcher: spawns `next dev --turbo -H localhost -p 31415`, polls until ready (25s timeout), then spawns Electron with `main.cjs`. |
| `build-electron.cjs` | Build script: runs `next build --webpack` in isolated `TMPDIR`/HOME with Electron-flavored env vars. |

### IPC handlers (`ipc/`)

| File | Role |
|---|---|
| `data-handlers.cjs` | JSON-file KV under `userData/storage/app-data.json`; `getDataPaths`, `factoryReset`, `restartApp`, `getEnvSafety` (Windows `Zone.Identifier`). All handlers wrapped with `requireValidIpcSender` from `ipc-security.cjs`. |
| `ollama-handlers.cjs` | Detects/launches Ollama per-OS (mdfind on mac, fs check on win, `which`/`command -v`/systemctl on linux). |
| `window-handlers.cjs` | Minimize, maxToggle, close=app.quit; zoom factor get/set/reset; window size query. |
| `find-handlers.cjs` | Wraps `webContents.findInPage` / `stopFindInPage` (matchCase, forward, findNext). |
| `system-handlers.cjs` | Platform string, system specs (systeminformation: cpu/ram/gpu), GitHub release update check, `shell.openExternal`. |

### Utils (`utils/`)

| File | Role |
|---|---|
| `window-manager.cjs` | Creates `BrowserWindow` (frameless on mac/win, persistent partition, preload, contextIsolation); zoom, context menu, find dispatch, `setWindowOpenHandler` denies + `shell.openExternal`, did-fail-load fallback, periodic storage flush. |
| `window-state.cjs` | Persists window bounds/maximized to `userData/window-state.json` (debounced 500ms). |
| `security.cjs` | Sets CSP via `onHeadersReceived` (`default-src 'self'`, restricted script-src, Google Fonts allowlist, `object-src 'none'`, `frame-ancestors 'none'`) + `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`. |
| `ipc-security.cjs` | `requireValidIpcSender` — validates IPC sender frame before handler runs; used by `data-handlers.cjs`. |
| `next-server.cjs` | Loads Next from `app.asar.unpacked`/local `node_modules`, calls `next({dev:false, dir}).prepare()`, wraps `getRequestHandler()` in `http.createServer` on ephemeral port; falls back to static `.next/server/app/*.html` if Next fails. |
| `menu.cjs` | App menu (mac app menu, File/Edit/View) wiring Find, Zoom In/Out/Reset, fullscreen; emits `shadowquill:find:*` and `shadowquill:zoom:changed` to focused window. |
| `data-paths.cjs` | OS-correct `userData` (`%LOCALAPPDATA%/ShadowQuill`, `~/Library/Application Support/ShadowQuill`, `~/.local/share/ShadowQuill`); handles `--factory-reset` CLI early wipe; clears Windows `Zone.Identifier` ADS. |

## Factory reset

- **UI** (`shadowquill:factoryReset`): renderer `clearAllStorageForFactoryReset()` → main clears `app-data.json` + sessions/cache + `window-state.json` → `location.assign("/workbench")` (no `app.relaunch()`).
- **CLI** (`--factory-reset` in `data-paths.cjs`): full `userData` wipe before start; spawns new process.

## IPC contract

All channels prefixed `shadowquill:` (invoke/handle, main returns Promise).

**Renderer → Main (`ipcRenderer.invoke`):**
- `shadowquill:getEnvSafety` · `shadowquill:restartApp` · `shadowquill:getDataPaths` · `shadowquill:factoryReset`
- `shadowquill:checkOllamaInstalled` · `shadowquill:openOllama`
- `shadowquill:getPlatform` · `shadowquill:getSystemSpecs` · `shadowquill:checkForUpdates` · `shadowquill:openExternalUrl`
- `shadowquill:storage:getItem|setItem|removeItem|clear|getAll` — JSON-file KV
- `shadowquill:window:minimize|maximizeToggle|close|getSize`
- `shadowquill:view:getZoomFactor|setZoomFactor|resetZoom`
- `shadowquill:find:findInPage|stopFindInPage`

**Main → Renderer:** `shadowquill:zoom:changed` · `shadowquill:find:show|next|previous` · `shadowquill:info`; DOM events via `executeJavaScript`: `found-in-page`, `app-info`.

## Next.js lifecycle

- **Dev**: `start-electron.cjs` → `next dev --turbo -H localhost -p 31415` → `loadURL(localhost:31415)`.
- **Prod**: `next-server.cjs` ephemeral port; static `.next/server/app/*.html` fallback; failure → `showErrorBox` + `quit`. **`before-quit`**: close HTTP server, flush session storage.

## Conventions (delta from root)

- **All main-process files are `.cjs`** — the project root has `"type": "module"`, so CommonJS in `electron/` is required.
- **`preload.cjs` is the only place** that touches `contextBridge`/`ipcRenderer`; never expose raw `ipcRenderer` to the renderer.
- **Privileged ops** (FS, processes, system info, network) live in main; renderer talks only to `window.shadowquill.*`.
- **Dev CSP allows `unsafe-eval`** for HMR (`security.cjs`); **prod CSP does not** — do not add `unsafe-eval` to prod.

## Anti-patterns (delta from root)

- ❌ **Do not expose `ipcRenderer` directly** — go through `contextBridge` in `preload.cjs`.
- ❌ **Do not add new IPC channels without registering a handler** in `main.cjs` / `ipc/*-handlers.cjs` AND a corresponding surface in `preload.cjs`.
- ❌ **Do not call `shell.openExternal` from the renderer** — route through `shadowquill:openExternalUrl`.
- ❌ **Do not use `setWindowOpenHandler` to open new windows** — it must `deny` and route to `shell.openExternal` (`window-manager.cjs`).
- ❌ **Do not set `frame: true`** on macOS/Windows — custom titlebar is intentional.
- ❌ **Do not store secrets in IPC payloads** — they're passed through the renderer.
- ❌ **Do not bypass `isLoopbackHost`** (`domain/model-config.ts`) — SSRF vector; main also fetches Ollama URLs.
