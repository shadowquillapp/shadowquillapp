# `src/components/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** cross-cutting UI shell + settings tab content. 14 top-level `.tsx` + 3 hook modules (`.ts`); presentational-only: `FeatherLoader.tsx`, `Logo.tsx`.

## File map

| File | Role |
|---|---|
| `Titlebar.tsx` | Custom Electron titlebar (platform, specs, window controls). |
| `ErrorBoundary.tsx` | Class component that catches render errors in subtree. |
| `DialogProvider.tsx` | Context + `useDialog()` — imperative modal/dialog API used app-wide. |
| `SettingsDialog.tsx` | Tabbed settings modal shell with directional transition animations. |
| `OllamaSetupPanel.tsx` | Shared Ollama install/connect UI; consumed by `settings/OllamaSetupContent` (and legacy `ModelConfigGate`). |
| `useOllamaSetup.ts` | Hook backing `OllamaSetupPanel` — model list, port, install/open, validation. |
| `useOpenOrInstallOllama.ts` | Electron IPC helper for open-or-install Ollama flow. |
| `useCloseOnEscape.ts` | Shared Escape-to-close hook (`SettingsDialog`, preset/model menus). |
| `ModelConfigGate.tsx` (~1200 lines) | **Orphaned** — not mounted in any route; Ollama onboarding lives in Settings → `OllamaSetupContent`. |
| `OllamaConnectionMonitor.tsx` | Background watcher that polls Ollama availability. |
| `FindBar.tsx` | Cmd+F-style in-page search with prev/next match navigation. |
| `GlobalZoomControl.tsx` | Listens for IPC and toggles window zoom factor. |
| `CustomSelect.tsx` | Portal-based dropdown selector with icon + disabled options. |
| `FeatherLoader.tsx` | Branded animated SVG loader ("Crafting..." text). |
| `Icon.tsx` | `Icon` wrapper around `@heroicons/react/24/solid|outline` with `IconName` union. |
| `Logo.tsx` | Inline SVG app logo. |
| `settings/AppVersionContent.tsx` | Version display + update check. |
| `settings/DisplayContent.tsx` | Zoom controls + display stats. |
| `settings/LocalDataManagementContent.tsx` | Storage paths, export, factory-reset. Flow: `clearAllStorageForFactoryReset()` → `window.shadowquill.factoryReset()` → `window.location.assign("/workbench")`; on failure calls `abortFactoryReset()`. |
| `settings/OllamaSetupContent.tsx` | Model install/connect/validate UI. |
| `settings/SystemPromptEditorContent.tsx` | Editable system-prompt textarea. |

## Conventions (delta from root)

- **`"use client"` is required when using hooks or browser APIs** — not every presentational component needs it.
- **`useDialog()` is the imperative modal API** — don't roll a per-component modal.
- **`Icon` is the only icon import path** — wrap Heroicons; do not import `@heroicons/react` directly elsewhere.
- **`settings/*` files are leaf tab content** consumed by `SettingsDialog`; do not render them standalone.
- **Ollama setup UI is shared** — `useOllamaSetup` + `OllamaSetupPanel`; settings tab is the live entry point. Do not fork a third setup form.

## Anti-patterns (delta from root)

- ❌ **Do not import `useDialog` in a server component** — it's a context hook.
- ❌ **Do not import `@heroicons/react` directly** — go through `Icon.tsx`.
- ❌ **Do not create a new modal pattern** — every modal goes through `DialogProvider`.
- ❌ **Do not add a `tailwind.config.js`** — Tailwind v4 CSS-first, tokens are CSS vars in `src/styles/`.
- ❌ **Do not couple `settings/*` to a specific tab** — `SettingsDialog` swaps them in/out.
- ⚠️ `biome-ignore` in components: `ModelConfigGate.tsx:408` (`useExhaustiveDependencies`) — 4th of 4 repo-wide suppressions.
