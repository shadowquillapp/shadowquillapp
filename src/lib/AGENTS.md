# `src/lib/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** persistence, prompt assembly, model client, presets, schema guards. All browser-only — assumes `window`.

## File map

| File | Role |
|---|---|
| `storage-keys.ts` | Sole registry of every localStorage/sessionStorage key + scope (`STORAGE_KEYS`, `ALL_LOCAL_KEYS`, `ALL_SESSION_KEYS`). Touching persistence = touching this. |
| `local-storage.ts` | Safe wrapper over `electron-storage`; `window` guards; factory-reset suppression. Public: `getRaw`, `getJSON` (overloaded), `setJSON`, `remove`, `clearAllStorageForFactoryReset`, `abortFactoryReset`, `isFactoryResetInProgress`. |
| `electron-storage.ts` | `class ElectronStorage` — in-memory cache backed by `window.shadowquill.storage` IPC bridge; serializes writes through a `writeQueue` promise. Public: `storage`, `storageAsync`. |
| `local-config.ts` | `SUPPORTED_OLLAMA_MODELS`, `isSupportedOllamaModelName`, `formatOllamaModelName`, `validateLocalModelConnection`, `listAvailableModels`. Barrel over `./domain/model-config`. |
| `model-client.ts` | `callLocalModelClient` — Ollama `/api/generate`, `MODEL_TEMPERATURE = 0.2` (fixed), meta word-count stripping. Throws `ModelError` / `NetworkError`. |
| `errors.ts` | `ShadowQuillError` hierarchy (`ValidationError`, `GenerationError`, `StorageError`, `ModelError`, …) + `wrapError`, `getUserMessage`, `formatErrorLog`. |
| `system-prompts.ts` | Customizable system-prompt template. `DEFAULT_BUILD_PROMPT`, `getSystemPromptBuild`, `ensureSystemPromptBuild`, `setSystemPromptBuild`, `resetSystemPromptBuild`. |
| `schema.ts` | Hand-rolled type guards (`isRecord`, `isString`, …, `isArrayOf`, `isOneOf`, `safeParse`); `safeParse` never throws, returns default on failure. Zero-dep choice (intentional). |
| `presets.ts` | **Barrel** (2 lines) re-exporting `TaskType` and `* from "./domain/presets"`. The real module is `./domain/presets.ts`. |
| `preset-store.ts` | Recents + last-selected layer. `getRecentPresetKeys`, `trackRecentPreset`, `getLastSelectedPresetKey`, `setLastSelectedPresetKey`, `PresetSummary`, `presetKey`, `mapPresetToSummary`, `mapPresetList`, `setRecentPresetKeys`, `pruneRecentPresets`. |
| `cache.ts` | Generic `LRUCache` with TTL; `getPromptCache`, `getTemplateCache`, session helpers — consulted before generation. |
| `prompt-builder-core.ts` | Semantic-intent prompt compiler. `VALIDATION_PIPELINE`, per-`TaskType` domain maps; throws `ValidationError`. Pure/testable. |
| `prompt-builder-client.ts` | Browser-side wrapper wiring `prompt-builder-core` to React/UI. |
| `version.ts` | App version string constant. |
| `prompt-directives/base.ts` | All directive fragments (`buildBaseDirectives`, `buildFormatDirectives`). |

## Conventions (delta from root)

- **No barrel `index.ts` at this level** — the only barrels are `presets.ts` and `prompt-directives/index.ts`. Import deep paths.
- **Module-level mutable singletons are normal** (`_factoryResetInProgress`, cache instances, `writeQueue`). React Context lives in `components/`, not here.
- **`typeof window === "undefined"` SSR guards** in browser-only helpers (`system-prompts.ts`'s `readRawPrompt`/`writeRawPrompt`).
- **Electron-bridge typing workaround**: `as unknown as T` only at the IPC boundary (`electron-storage.ts`).
- **Errors flow through `errors.ts`** — `prompt-builder-core` throws `ValidationError`; `model-client` throws `ModelError` / `NetworkError`.

## Anti-patterns (delta from root)

- ❌ **Do not add a new storage key without declaring it in `storage-keys.ts`.**
- ❌ **Do not throw in `safeParse`** — the whole point is no-throw default-on-fail.
- ❌ **Do not introduce Zod/Valibot** — `schema.ts` is the deliberate zero-dep replacement.
- ❌ **Do not import React** from any file in this folder — this is data/logic only.

## Subtree context

- `src/lib/domain/AGENTS.md` — `presets`, `model-config`, `tabs`, `projects` domain types/CRUD.
