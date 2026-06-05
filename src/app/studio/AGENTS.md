# `src/app/studio/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** preset authoring studio. `page.tsx` is a server component that sets `metadata` and renders `<PresetStudioPage />` (client).

## Layout

```
studio/
├── page.tsx                          # server; metadata only
├── PresetStudioPage.tsx              # client; page-level state + composition
├── components/                       # 7 files (see below)
└── hooks/
    └── usePresetManager.ts           # load/save/delete/duplicate via domain/presets
```

## Components

| File | Role |
|---|---|
| `StudioHeader.tsx` | Page header (sidebar toggle). |
| `PresetLibrary.tsx` | Searchable sidebar list. |
| `PresetCard.tsx` | Preset card item. |
| `PresetEditor.tsx` | Single-page scrollable editor (Basics + Task + Context). |
| `BasicSettings.tsx` | Core preset fields. |
| `TypeSpecificFields.tsx` | Essential per-task-type fields (1–3 each). |

## Conventions (delta from root)

- **`PresetStudioPage` is the page-level state owner** — selected preset, editing preset, dirty flag, sidebar open, small-screen flag. Pull everything through `usePresetManager()`.
- **Auto-selects last-used preset on mount**; warns on `beforeunload` if dirty.
- **Themed `data-theme` attribute applied on mount** — same logic as workbench.
- **Persistence delegates to `src/lib/domain/presets.ts`** via the studio's `usePresetManager`.
- **`usePresetManager` is the only preset-authoring API** — load, save, delete, duplicate.

## Anti-patterns (delta from root)

- ❌ **Do not import from `src/lib/domain/presets.ts` directly in components** — go through the studio's `usePresetManager`.
- ❌ **Do not create a parallel editor form** — `PresetEditor` composes the field components.
- ❌ **Do not move `PresetStudioPage.tsx` inside `components/`** — sibling-of-`page.tsx` is the convention here.
- ❌ **Do not introduce a different state library** — page-level state stays in `PresetStudioPage`.
