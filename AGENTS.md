# ShadowQuill — AGENTS.md

AI assistant for building prompts. Desktop app: **Next.js 16 (App Router) + React 19, wrapped in Electron 39**, talking to a **local Ollama** runtime. TypeScript strict. Pnpm. Biome (no ESLint). Vitest + Testing Library.

> Generated `2026-06-10` from commit `28791ee` on `refactor/reduce-loc-dedupe`. Run `git log --oneline -5` to confirm freshness.

## Top-level layout

| Path | Role |
|---|---|
| `src/app/` | App Router routes. `layout.tsx` (root), `page.tsx` (redirects to `/workbench`), `workbench/`, `studio/`. No nested layouts. |
| `src/components/` | Cross-cutting UI: `Titlebar`, `ErrorBoundary`, `DialogProvider`, `SettingsDialog`, `ModelConfigGate`, etc. `settings/` = tab content for `SettingsDialog`. |
| `src/lib/` | All persistence, prompt assembly, model client, presets. Browser-only — assumes `window`. |
| `src/styles/` | CSS architecture: `index.css` → variables → base → components → features → animations. |
| `src/__tests__/` | Vitest specs (`.test.ts(x)`). Colocated with module names. |
| `src/types/` | One shared `index.ts`. |
| `electron/` | Main process: `main.cjs`, `preload.cjs`, `start-electron.cjs`, `build-electron.cjs`, `ipc/`, `utils/`. |
| `public/` | Static assets. |
| `config/vitest.config.ts` | Test config (jsdom, `@` → `src/`). |
| `scripts/` | `postinstall.js`, `update-version.js`. |

## Subtree context

- `src/lib/AGENTS.md` — storage, prompt builder, presets, model client.
- `src/lib/domain/AGENTS.md` — `presets`, `model-config`, `tabs`, `projects` domain types/CRUD.
- `src/components/AGENTS.md` — cross-cutting UI + settings tabs.
- `src/app/workbench/AGENTS.md` — main prompt workbench (the primary surface).
- `src/app/studio/AGENTS.md` — preset authoring studio.
- `src/styles/AGENTS.md` — design tokens, CSS architecture.
- `electron/AGENTS.md` — main process, IPC contract, security boundaries.

## Code map (highest fan-in / most central)

| Symbol | Why central |
|---|---|
| `src/components/Icon.tsx` (22) | Only Heroicons import path; used across studio, workbench, components, lib. |
| `src/types/index.ts` (16) | Shared `TaskType`, `PresetLite`, `GenerationOptions`, `TestMessage`, … |
| `src/lib/storage-keys.ts` (12) | Sole registry of every localStorage/sessionStorage key + scope. Touching persistence = touching this. |
| `src/lib/local-storage.ts` (12) | Safe wrapper over `electron-storage` with `window` guards and factory-reset suppression. |
| `src/components/DialogProvider.tsx` (9) | Imperative `useDialog()` modal API used app-wide. |
| `src/lib/local-config.ts` (8) | Ollama model config + connection validation; barrel over `domain/model-config.ts`. |
| `src/lib/model-client.ts` | `callLocalModelClient` — Ollama `/api/generate`; fixed temperature 0.2 (not user-configurable). |
| `src/lib/errors.ts` | Typed error hierarchy (`ShadowQuillError`, `ValidationError`, `ModelError`, …). |
| `src/lib/prompt-builder-core.ts` | Semantic-intent prompt compiler with `VALIDATION_PIPELINE` + per-`TaskType` domain maps. |
| `src/lib/domain/presets.ts` (~362 lines) | Preset CRUD; ships 10 seeded presets; no versioning API. |
| `src/lib/system-prompts.ts` (2) | Customizable system-prompt template. |
| `electron/preload.cjs` | Single `contextBridge` surface (`window.shadowquill.*`). |

## Commands

| Task | Command |
|---|---|
| Dev (Electron + Next) | `pnpm dev` |
| Start (prod build) | `pnpm start` |
| Tests | `pnpm test` (one-shot) / `pnpm test:watch` |
| Coverage | `pnpm test:coverage` |
| Typecheck | `pnpm typecheck` |
| Lint/format | `pnpm check` (Biome read-only) · `pnpm check:write` (Biome autofix) · `pnpm check:unsafe` (autofix unsafe) |
| Build (Electron) | `pnpm build` |
| DMG (mac arm64) | `pnpm build:dmg` · signed: `pnpm build:dmg:signed` (needs `.env.local`) |
| Windows NSIS | `pnpm build:win` |

## Stack-specific rules

- **TypeScript strict** + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`. `as T` casts mostly forbidden; `as unknown as T` only for Electron-bridge typing.
- **Path alias**: `@/*` → `src/*`. Always use it from `src/`.
- **No server-side state.** Next is the bundler/host; the app is a client-rendered SPA inside Electron. No `cookies()`, `headers()`, `unstable_cache`, route handlers, or RSC data fetching. Server components exist only to set `metadata` and hand off to a client component.
- **No barrel `index.ts` at `src/lib/` root.** The only barrels are `src/lib/presets.ts` (2-line re-export) and `src/lib/prompt-directives/index.ts`. Import deep paths.
- **Persistence = localStorage + sessionStorage + Electron IPC file KV.** No IndexedDB, no Cookies. All keys must be declared in `storage-keys.ts`.
- **Semantic-intent prompt compiler** — `prompt-builder-core.ts` + `prompt-directives/base.ts` assemble prompts by task type (`intent`, `engineering`, `visual`, `analysis`, `narrative`, `persuasion`, `motion`). No per-task directive files.
- **Temperature is not user-configurable** — fixed at `0.2` in `model-client.ts` (`MODEL_TEMPERATURE`).
- **Tailwind v4 CSS-first config.** No `tailwind.config.js`. Single `@import "tailwindcss";` in `src/styles/index.css`. No `@theme` block — design tokens are plain `:root` CSS variables, consumed via `var(--color-*)`. Single fixed dark palette (black, gray, white); no theme switching.
- **Biome is the only linter/formatter.** Do not introduce ESLint, Prettier, or Husky configs. `biome-ignore` comments are the only suppression mechanism (4 sites in `src/` — see workbench + components `AGENTS.md`).
- **Use Heroicons only** (`@heroicons/react/24/solid` or `outline`). Wrap with `src/components/Icon.tsx`.
- **Vitest with jsdom**, `globals: true`. Mocks for `localStorage`, `sessionStorage`, `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `fetch` live in `src/__tests__/setup.ts`. URL is `http://localhost:31415` (matches Electron dev port).
- **`"use client"` is required on every component file that uses hooks or browser APIs.** 27 client components already; 0 server components beyond the page/layout shells.
- **No external CDN links** — full offline operation (`src/app/layout.tsx:29`). All assets local.

## Anti-patterns (project-specific)

- ❌ **Do not add a `tailwind.config.js`** — v4 uses CSS-first.
- ❌ **Do not add a `cookies()`/`headers()`-based state layer** — app is offline + desktop.
- ❌ **Do not introduce Zustand / Redux / Jotai** — state is module-level singletons (`local-storage.ts`, `electron-storage.ts`, `cache.ts`) + React Context (`DialogProvider`).
- ❌ **Do not bypass `STORAGE_KEYS`** — declare a new key in `src/lib/storage-keys.ts` first, then use it.
- ❌ **Do not let an unhandled Ollama URL out of `domain/model-config.ts`'s `isLoopbackHost` guard** — it's an SSRF defense because Electron main also fetches the URL.
- ❌ **Do not add `unsafe-eval` to prod CSP** — dev CSP in `electron/utils/security.cjs` allows it for HMR; prod does not.
- ❌ **Do not add bare `as any`** — current code has none; use proper types or `as unknown as T`.
- ❌ **Do not put components in `src/lib/`** — that's data/logic only.
- ❌ **Do not import `useDialog` in a server component** — it's a context hook.
- ⚠️ **Hard-coded model allow-list** in `src/lib/local-config.ts` (`SUPPORTED_OLLAMA_MODELS` + `isSupportedOllamaModelName`). Update here and in `listAvailableModels` when adding models.

## Build / test entry points

- **Electron main**: `electron/main.cjs` (prod) / `electron/start-electron.cjs` (dev, port 31415).
- **Next server**: ephemeral in prod (`electron/utils/next-server.cjs`), `localhost:31415` in dev.
- **Renderer entry**: `src/app/layout.tsx` → `src/app/page.tsx` (redirects to `/workbench`).