# `src/lib/domain/` — AGENTS.md

**Parent:** [`src/lib/AGENTS.md`](../AGENTS.md)
**Scope:** domain entity types + CRUD. Pure data, no React, no `window`.

## File map

| File | Role |
|---|---|
| `presets.ts` | `Preset`, `parsePreset`, `getPresets`, `getPresetById`, `getDefaultPresets`, `ensureDefaultPreset`, `savePreset`, `deletePresetByIdOrName`. **Ships 10 seeded presets.** |
| `model-config.ts` | `LocalModelConfig`, `DEFAULT_OLLAMA_BASE_URL`, `isLoopbackHost`, `validateOllamaBaseUrl`, `readLocalModelConfig`, `writeLocalModelConfig`, `clearLocalModelConfig`. **SSRF guard** — restricts base URLs to loopback hosts because Electron main also fetches the URL. |
| `tabs.ts` | Workbench tab state types + serialization. Single import, leaf module. |
| `projects.ts` | Project entity CRUD. Single import, leaf module. |

## Conventions (delta from parent)

- **Pure types and pure functions.** No `localStorage` / `sessionStorage` calls here — those live in the upper layer (`local-storage.ts`, `preset-store.ts`). This keeps CRUD testable without mocks.
- **`isLoopbackHost` is the single security boundary** for Ollama URLs. Any code path that accepts a user-supplied base URL **must** call it first.

## Anti-patterns (delta from parent)

- ❌ **Do not import from `local-storage.ts` or `electron-storage.ts`** — keep CRUD pure; persistence is the caller's job.
- ❌ **Do not add a non-loopback branch to `isLoopbackHost`** — it's an SSRF defense, not a feature toggle.
- ❌ **Do not store non-serializable values in `Preset.options`** — options must remain JSON-serializable.
