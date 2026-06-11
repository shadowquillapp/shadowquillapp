# `src/app/studio/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** preset authoring studio. `page.tsx` is a server component that sets `metadata` and renders `<PresetStudioPage />` (client).

## Layout

```
studio/
├── page.tsx                          # server; metadata only
├── PresetStudioPage.tsx              # client; page-level state + composition
├── components/                       # 5 files (see below)
└── hooks/
    └── usePresetManager.ts           # load/save/delete/duplicate via @/lib/presets
```

## Components

| File | Role |
|---|---|
| `StudioHeader.tsx` | Page header (sidebar toggle). |
| `PresetLibrary.tsx` | Searchable sidebar list. |
| `PresetCard.tsx` | Preset card item. |
| `PresetEditor.tsx` | Single-page scrollable editor: `BasicSettings` + inline Context fields (identity, additional context). |
| `BasicSettings.tsx` | Core preset fields. |

## Conventions (delta from root)

- **`PresetStudioPage` is the page-level state owner** — selected preset, editing preset, dirty flag, sidebar open, small-screen flag. Pull everything through `usePresetManager()`.
- **Auto-selects last-used preset on mount**; warns on `beforeunload` if dirty.
- **Persistence via `@/lib/presets` barrel** through the studio's `usePresetManager` (not direct `@/lib/domain/presets` imports in components).
- **`usePresetManager` is the only preset-authoring API** — load, save, delete, duplicate only.

## Anti-patterns (delta from root)

- ❌ **Do not import from `@/lib/domain/presets.ts` directly in components** — go through the studio's `usePresetManager` or `@/lib/presets` barrel.
- ❌ **Do not create a parallel editor form** — `PresetEditor` composes `BasicSettings` + inline context fields.
- ❌ **Do not move `PresetStudioPage.tsx` inside `components/`** — sibling-of-`page.tsx` is the convention here.
- ❌ **Do not introduce a different state library** — page-level state stays in `PresetStudioPage`.
