# `src/styles/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** design tokens, themes, base reset, components, features, animations. Single entry: `index.css`.

## Architecture (import order in `index.css`)

`0. TAILWIND` → `1. VARIABLES` → `2. THEMES` → `3. BASE` → `4. COMPONENTS` → `5. FEATURES` → `6. UTILITIES` → `7. ANIMATIONS`

Cascade authority comes from import **order**, not `@layer`. Each subfolder has a `_index.css` re-export partial (native CSS `@import` chain; no PostCSS-import plugin).

## File map

| Folder | Files | Role |
|---|---|---|
| `variables/` (4) | `_colors.css`, `_spacing.css`, `_typography.css`, `_index.css` | Design tokens in `:root`. Colors: semantic palette (`--color-surface`, `-primary`, `-save`, `-attention`, `-destructive`, `-on-*`) + tonal scales (`--primarya0..a50`, `--surfacea0..a50`). Spacing: `--space-0..10` (4px), `--radius-sm/md/lg`, `--shadow-1/2`. Typography: `--font-sans` → `--font-geist-sans` (set by `next/font` in `layout.tsx`). |
| `themes/` (4) | `_purpledark.css`, `_dark.css`, `_light.css`, `_index.css` | `[data-theme="…"]` selector overrides on the same token names. Default (earth) palette is in `variables/_colors.css :root`. |
| `base/` (4) | `_reset.css`, `_scrollbar.css`, `_typography.css`, `_index.css` | Browser normalization layer. |
| `components/` (13) | `_buttons.css`, `_inputs.css`, `_chips.css`, `_cards.css`, `_modals.css`, `_menus.css`, `_links.css`, `_loaders.css`, `_code-blocks.css`, `_toasts.css`, `_mode-toggle.css`, `_message-bubble.css`, `_index.css` | Reusable UI primitives; one CSS file per widget type. `_buttons.css` includes `.preset-studio-btn` for studio save/action buttons. |
| `features/` (6) | `_ollama.css`, `_workbench.css`, `_version-history.css` (largest, ~20k), `_refine-panel.css`, `_find-highlight.css`, `_index.css` | Page/feature-scoped composite UI. |
| `utilities/` (1) | `_spacing.css` | Helper classes. |
| `animations/` (1) | `_index.css` | `@keyframes` (md-spin, version-pulse, status-pulse, version-created, output-fade-in, version-switch, generating-border-shimmer, generating-soft-glow, generating-stop-pulse, page-fade-in) + `.theme-transitioning` cascade (pairs with `theme-preference.ts`). |

## Conventions (delta from root)

- **Tailwind v4 CSS-first** — single `@import "tailwindcss";` in `index.css`. No `tailwind.config.js`.
- **No `@theme` block** — design tokens are plain `:root` CSS variables, consumed via `var(--color-*)`. Utilities like `bg-color-primary` are NOT auto-generated.
- **No `@source` / `@plugin` / `@custom-variant` / `@utility` directives** in this tree.
- **No `@layer base/components/utilities`** — all custom CSS is unlayered; cascade authority = import order.
- **Theme switching = `[data-theme="…"]` attribute selectors** on `<html>`. Set by `public/theme-init.js` (synchronous, runs in `<head>` to prevent FOUC) and by `app/layout.tsx` clients.
- **File naming**: `_name.css` partials, underscore prefix is convention-only (no SCSS/postcss-import config).
- **`color-mix(in srgb, var(--color-primary) 50%, …)`** is used freely in animation keyframes.

## Anti-patterns (delta from root)

- ❌ **Do not add a `tailwind.config.js`** — tokens are CSS variables, not Tailwind theme.
- ❌ **Do not add an `@theme` block** — it would change how tokens are consumed and break the current pattern.
- ❌ **Do not use `:root.dark` / `.dark` class names** — themes use `[data-theme="…"]`.
- ❌ **Do not add a `.css` file that is not imported through `_index.css`** — order is the only cascade authority.
- ❌ **Do not duplicate tokens** — every color/spacing/font lives in `variables/`.
- ❌ **Do not introduce a CSS-in-JS library** — this codebase is plain CSS.
