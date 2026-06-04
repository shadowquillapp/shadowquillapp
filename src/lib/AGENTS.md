# `src/lib/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** persistence, prompt assembly, model client, presets, schema guards. All browser-only — assumes `window`.

## File map

| File | Role |
|---|---|
| `storage-keys.ts` | Sole registry of every localStorage/sessionStorage key + scope (`STORAGE_KEYS`, `ALL_LOCAL_KEYS`, `ALL_SESSION_KEYS`). Touching persistence = touching this. |
| `local-storage.ts` | Safe wrapper over `electron-storage`; `window` guards; factory-reset suppression. Public: `getRaw`, `getJSON` (overloaded), `setJSON`, `remove`, `clearAllStorageForFactoryReset`, `isFactoryResetInProgress`. |
| `electron-storage.ts` | `class ElectronStorage` — in-memory cache backed by `window.shadowquill.storage` IPC bridge; serializes writes through a `writeQueue` promise. `isElectronStorageAvailable()`. |
| `local-config.ts` | `validateLocalModelConnection`, `listAvailableModels` (hard-filtered to `gemma3:4b|12b|27b` — see TODO at `:73`). Barrel over `./domain/model-config`. |
| `system-prompts.ts` | Customizable system-prompt template. `DEFAULT_BUILD_PROMPT`, `getSystemPromptBuild`, `ensureSystemPromptBuild`, `setSystemPromptBuild`, `resetSystemPromptBuild`. |
| `schema.ts` | Hand-rolled type guards (`isRecord`, `isString`, …, `isArrayOf`, `isOneOf`, `safeParse`); `safeParse` never throws, returns default on failure. Zero-dep choice (intentional). |
| `presets.ts` | **Barrel** (2 lines) re-exporting `TaskType` and `* from "./domain/presets"`. The real module is `./domain/presets.ts`. |
| `preset-store.ts` | Cross-cutting "recents + last-selected" layer on top of presets. `getRecentPresetKeys`, `trackRecentPreset`, `getLastSelectedPresetKey`, `setLastSelectedPresetKey`, `consumeApplyPreset` (sessionStorage hand-off). |
| `cache.ts` | `SQ_PROMPT_CACHE` — manual sessionStorage LRU-ish prompt cache, consulted before generation. |
| `prompt-builder-core.ts` | Pure prompt-assembly logic (server/testable). |
| `prompt-builder-client.ts` | Browser-side wrapper wiring `prompt-builder-core` to React/UI. |
| `prompt-normalization.ts` | `normalizePrompt()` — trims/whitespace/quote handling for user input. |
| `example-generator.ts` | Generates a few-shot example block from a preset. |
| `version.ts` | App version string constant. |
| `local-db.ts` | 35-byte stub re-exporting `local-config` (placeholder; not a real DB). |
| `prompt-directives/index.ts` | **Barrel** of per-task-type directive fragments. |
| `prompt-directives/{base,coding,image,marketing,research,video,writing}.ts` | Per-task directive fragments; `base.ts` is the shared header. |

## Conventions (delta from root)

- **No barrel `index.ts` at this level** — the only barrels are `presets.ts` and `prompt-directives/index.ts`. Import deep paths.
- **Module-level mutable singletons are normal** (`_factoryResetInProgress`, `cache`, `writeQueue`). React Context lives in `components/`, not here.
- **`typeof window === "undefined"` SSR guards** in browser-only helpers (`system-prompts.ts`'s `readRawPrompt`/`writeRawPrompt`).
- **Electron-bridge typing workaround**: `as unknown as T` only at the IPC boundary (`electron-storage.ts`).

## Anti-patterns (delta from root)

- ❌ **Do not add a new storage key without declaring it in `storage-keys.ts`.**
- ❌ **Do not throw in `safeParse`** — the whole point is no-throw default-on-fail.
- ❌ **Do not introduce Zod/Valibot** — `schema.ts` is the deliberate zero-dep replacement.
- ❌ **Do not add a real DB** to `local-db.ts` — it's a placeholder; remove the stub if you don't need it.
- ❌ **Do not import React** from any file in this folder — this is data/logic only.

## Subtree context

- `src/lib/domain/AGENTS.md` — `presets`, `model-config`, `tabs`, `projects` domain types/CRUD.
