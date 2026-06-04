# `src/components/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** cross-cutting UI shell + settings tab content. All 10 top-level files use `"use client"`.

## File map

| File | Role |
|---|---|
| `Titlebar.tsx` | Custom Electron titlebar (platform, specs, window controls). |
| `ErrorBoundary.tsx` | Class component that catches render errors in subtree. |
| `DialogProvider.tsx` | Context + `useDialog()` — imperative modal/dialog API used app-wide. |
| `SettingsDialog.tsx` | Tabbed settings modal shell with directional transition animations. |
| `ModelConfigGate.tsx` (~1196 lines) | Onboarding gate — first thing in workbench; pre-validates Ollama. |
| `OllamaConnectionMonitor.tsx` | Background watcher that polls Ollama availability. |
| `FindBar.tsx` | Cmd+F-style in-page search with prev/next match navigation. |
| `GlobalZoomControl.tsx` | Listens for IPC and toggles window zoom factor. |
| `CustomSelect.tsx` | Portal-based dropdown selector with icon + disabled options. |
| `FeatherLoader.tsx` | Branded animated SVG loader ("Crafting..." text). |
| `Icon.tsx` | `Icon` wrapper around `@heroicons/react/24/solid|outline` with `IconName` union. |
| `Logo.tsx` | Inline SVG app logo. |
| `settings/AppVersionContent.tsx` | Version display + update check. |
| `settings/DisplayContent.tsx` | Theme, font scale, zoom, density controls. |
| `settings/LocalDataManagementContent.tsx` | Storage paths, export, factory-reset. |
| `settings/OllamaSetupContent.tsx` | Model install/connect/validate UI. |
| `settings/SystemPromptEditorContent.tsx` | Editable system-prompt textarea. |

## Conventions (delta from root)

- **`"use client"` is mandatory** — every file here uses hooks or browser APIs.
- **`useDialog()` is the imperative modal API** — don't roll a per-component modal.
- **`Icon` is the only icon import path** — wrap Heroicons; do not import `@heroicons/react` directly elsewhere.
- **`settings/*` files are leaf tab content** consumed by `SettingsDialog`; do not render them standalone.
- **`ModelConfigGate` is the only place** that owns the onboarding flow — do not duplicate its validation in components.

## Anti-patterns (delta from root)

- ❌ **Do not import `useDialog` in a server component** — it's a context hook.
- ❌ **Do not import `@heroicons/react` directly** — go through `Icon.tsx`.
- ❌ **Do not create a new modal pattern** — every modal goes through `DialogProvider`.
- ❌ **Do not add a `tailwind.config.js`** — Tailwind v4 CSS-first, tokens are CSS vars in `src/styles/`.
- ❌ **Do not couple `settings/*` to a specific tab** — `SettingsDialog` swaps them in/out.
