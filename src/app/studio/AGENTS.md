# `src/app/studio/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** preset authoring studio. `page.tsx` is a server component that sets `metadata` and renders `<PresetStudioPage />` (client).

## Layout

```
studio/
├── page.tsx                          # server; metadata only
├── PresetStudioPage.tsx              # client; page-level state + composition
├── components/                       # 9 files (see below)
└── hooks/
    └── usePresetManager.ts           # load/save/delete/duplicate/import/export
```

## Components

| File | Role |
|---|---|
| `StudioHeader.tsx` | Page header (sidebar toggle). |
| `PresetLibrary.tsx` | List/grid sidebar. |
| `PresetCard.tsx` | Preset card item. |
| `PresetEditor.tsx` | Editor form (consumes all field/setting components). |
| `BasicSettings.tsx` | Basic config fields. |
| `AdvancedSettings.tsx` | Advanced config fields. |
| `TypeSpecificFields.tsx` | Per-task-type fields. |
| `SaveAsDialog.tsx` | Save-as modal. |

## Conventions (delta from root)

- **`PresetStudioPage` is the page-level state owner** — selected preset, editing preset, dirty flag, sidebar open, small-screen flag. Pull everything through `usePresetManager()`.
- **Auto-selects last-used preset on mount**; warns on `beforeunload` if dirty.
- **Themed `data-theme` attribute applied on mount** — same logic as workbench.
- **All persistence is `localStorage`-backed** via the studio's `usePresetManager` (which delegates to `src/lib/domain/presets.ts`).
- **`usePresetManager` is the only preset-authoring API** — load, save, delete, duplicate, import, and export presets.

## Anti-patterns (delta from root)

- ❌ **Do not import from `src/lib/domain/presets.ts` directly** — go through the studio's `usePresetManager`.
- ❌ **Do not create a parallel editor form** — `PresetEditor` composes the field components.
- ❌ **Do not move `PresetStudioPage.tsx` inside `components/`** — sibling-of-`page.tsx` is the convention here.
- ❌ **Do not introduce a different state library** — page-level state stays in `PresetStudioPage`.
- ⚠️ `biome-ignore a11y/useSemanticElements` is used in `SaveAsDialog.tsx:63` (modal backdrop) — keep the justification if you touch it.
