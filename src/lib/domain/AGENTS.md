# `src/lib/domain/` — AGENTS.md

**Parent:** [`src/lib/AGENTS.md`](../AGENTS.md)
**Scope:** domain entity types + CRUD. No React, no Electron IPC — persistence via `local-storage.ts`.

## File map

| File | Role |
|---|---|
| `presets.ts` (~362 lines) | `Preset`, `parsePreset`, `getPresets`, `getPresetById`, `getDefaultPresets`, `ensureDefaultPreset`, `savePreset`, `deletePresetByIdOrName`. **Ships 10 seeded presets.** Task types: `intent`, `engineering`, `visual`, `analysis`, `narrative`, `persuasion`, `motion`. No versioning API. |
| `model-config.ts` | `LocalModelConfig`, `DEFAULT_OLLAMA_BASE_URL`, `isLoopbackHost`, `validateOllamaBaseUrl`, `readLocalModelConfig`, `writeLocalModelConfig`, `clearLocalModelConfig`. **SSRF guard** — restricts base URLs to loopback hosts because Electron main also fetches the URL. `clearLocalModelConfig` is **not** re-exported from `local-config.ts` barrel. |
| `tabs.ts` | Workbench tab state types + `readTabState`, `writeTabState`, `clearTabState` (persisted via `local-storage`). |
| `projects.ts` | Project CRUD: `listProjectsByUser`, `createProject`, `appendMessagesWithCap`, `getProject`, `updateProjectVersionGraph`, `deleteProject`, `deleteProjects`. |

## Conventions (delta from parent)

- **Domain modules own their persistence** — all four files import `../local-storage` directly. No React or Electron IPC here.
- **`isLoopbackHost` is the single security boundary** for Ollama URLs. Any code path that accepts a user-supplied base URL **must** call it first.
- **`Preset.options` must stay JSON-serializable** — validated on parse via `ALLOWED_OPTION_KEYS`.

## Anti-patterns (delta from parent)

- ❌ **Do not import React or Electron IPC** from domain modules.
- ❌ **Do not add a non-loopback branch to `isLoopbackHost`** — it's an SSRF defense, not a feature toggle.
- ❌ **Do not store non-serializable values in `Preset.options`** — options must remain JSON-serializable.
- ❌ **Do not bypass `storage-keys.ts`** — domain modules use keys from `STORAGE_KEYS` only.
