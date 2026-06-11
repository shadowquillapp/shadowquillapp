# `src/app/workbench/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** the primary surface — the prompt workbench. `page.tsx` is a thin server shell that renders `<PromptWorkbench />` only.

## Layout (deeply nested co-location)

```
workbench/
├── page.tsx                          # server; <PromptWorkbench /> only
└── _components/
    ├── PromptWorkbench.tsx           # client; orchestrator (10 hooks + dialogs)
    └── workbench/                    # <-- same name, deeper: feature internals
        ├── MessageRenderer.tsx
        ├── PresetInfoDialog.tsx
        ├── PresetPickerModal.tsx
        ├── TabBar.tsx
        ├── VersionNavigator.tsx
        ├── VersionTimeline.tsx
        ├── types.ts                  # MessageItem, PromptPresetSummary, VersionGraph
        ├── useTabManager.ts          # ⚠ lives here, NOT in hooks/ (inconsistent on purpose)
        ├── version-graph.ts          # createVersionGraph, appendVersion, undoVersion, redoVersion, migrateVersionGraph
        ├── components/               # InputPanel, ModelSelector, OutputPanel, RefinementContextPanel, TextStats, VersionDropdown
        ├── hooks/                    # 9 hooks (see below)
        └── utils/                    # copyMessage, presetUtils
```

## Hooks (`_components/workbench/hooks/`)

| Hook | Role |
|---|---|
| `useGeneration.ts` | Send prompts, stop generation; calls `callLocalModelClient` + `prompt-builder-client`; appends versions. |
| `useCopyMessage.ts` | Clipboard copy + 2s `copied` state. |
| `useKeyboardShortcuts.ts` | Cmd/Ctrl+T for new tab, etc. |
| `useModelManager.ts` | List local models, current model id, menu state. |
| `usePanelResize.ts` | Mouse-drag resize; persists width via `local-storage`. |
| `usePresetManager.ts` | Preset list, selection, apply, recent tracking. |
| `useProjectManager.ts` | Project CRUD (local DB): list, load, delete, delete-all, ensure. |
| `useTextStats.ts` | Word + char count (memoized). |
| `useVersionNavigation.ts` | Prev/next version traversal in graph. |

## Conventions (delta from root)

- **`_components/` underscore prefix** is a "private folder" convention only — Next has no special meaning for it.
- **`PromptWorkbench` is the only orchestrator** — it composes 10 hooks (9 in `hooks/` + `useTabManager`) and opens `SettingsDialog` / `PresetInfoDialog` / `PresetPickerModal`.
- **Triple-nested co-location** (`_components` → `workbench` → `components|hooks|utils`) is intentional. Don't flatten it.
- **`useTabManager.ts` lives next to `types.ts` and `version-graph.ts`**, not inside `hooks/`. Do not move it — that inconsistency is on purpose.

## Anti-patterns (delta from root)

- ❌ **Do not add `loading.tsx` / `error.tsx` / `not-found.tsx`** — none exist app-wide; rely on `ErrorBoundary` + `useDialog`.
- ❌ **Do not import `useDialog` from a server component** — it only works in `PromptWorkbench` and below.
- ❌ **Do not reach into another feature's hooks folder** — they are workbench-internal.
- ❌ **Do not bypass `useGeneration`** for ad-hoc prompt sends — all output flows through the version graph.
- ⚠️ `biome-ignore` in workbench tree (3 of 3 repo-wide): `PromptWorkbench.tsx:107` (`useExhaustiveDependencies`), `:324` (a11y resize handle), `PresetPickerModal.tsx:333` (stop propagation).
