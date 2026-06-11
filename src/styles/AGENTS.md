# `src/styles/` — AGENTS.md

**Parent:** [`/AGENTS.md`](../../AGENTS.md)
**Scope:** design tokens, base reset, components, features, animations. Single entry: `index.css`.

## Architecture (import order in `index.css`)

`0. TAILWIND` → `1. VARIABLES` → `2. BASE` → `3. COMPONENTS` → `4. FEATURES` → `5. UTILITIES` → `6. ANIMATIONS`

Cascade authority comes from import **order**, not `@layer`. Each subfolder has a `_index.css` re-export partial (native CSS `@import` chain; no PostCSS-import plugin).

## File map

| Folder | Files | Role |
|---|---|---|
| `variables/` (4) | `_colors.css`, `_spacing.css`, `_typography.css`, `_index.css` | Design tokens in `:root`. Colors: semantic palette + tonal scales. Spacing: `--space-0..10`, radius, shadows. Typography: `--font-sans` / `--font-mono` → Söhne stacks in `base/_fonts.css`. |
| `base/` (5) | `_reset.css`, `_scrollbar.css`, `_typography.css`, `_fonts.css`, `_index.css` | Browser normalization + self-hosted Söhne fonts. |
| `components/` (12) | `_buttons.css`, `_inputs.css`, `_chips.css`, `_cards.css`, `_modals.css`, `_menus.css`, `_links.css`, `_loaders.css`, `_code-blocks.css`, `_mode-toggle.css`, `_message-bubble.css`, `_index.css` | Reusable UI primitives; one CSS file per widget type. |
| `features/` (5) | `_console-shell.css`, `_ollama.css`, `_workbench.css`, `_refine-panel.css`, `_find-highlight.css`, `_index.css` | Page/feature-scoped composite UI. |
| `utilities/` (1) | `_spacing.css` | Helper classes. |
| `animations/` (1) | `_index.css` | `@keyframes` (md-spin, output-fade-in, fade-in-up/down/scale) + `.workbench--generating` dimming rules. |

## Conventions (delta from root)

- **Tailwind v4 CSS-first** — single `@import "tailwindcss";` in `index.css`. No `tailwind.config.js`.
- **No `@theme` block** — design tokens are plain `:root` CSS variables, consumed via `var(--color-*)`. Utilities like `bg-color-primary` are NOT auto-generated.
- **No `@source` / `@plugin` / `@custom-variant` / `@utility` directives** in this tree.
- **No `@layer base/components/utilities`** — all custom CSS is unlayered; cascade authority = import order.
- **Single fixed dark palette** (black, gray, white) defined in `variables/_colors.css :root`. There is no theme switching.
- **File naming**: `_name.css` partials, underscore prefix is convention-only (no SCSS/postcss-import config).
- **`color-mix(in srgb, var(--color-primary) 50%, …)`** is used freely in animation keyframes.

## Anti-patterns (delta from root)

- ❌ **Do not add a `tailwind.config.js`** — tokens are CSS variables, not Tailwind theme.
- ❌ **Do not add an `@theme` block** — it would change how tokens are consumed and break the current pattern.
- ❌ **Do not reintroduce theme switching** — the app has a single fixed palette.
- ❌ **Do not add a `.css` file that is not imported through `_index.css`** — order is the only cascade authority.
- ❌ **Do not duplicate tokens** — every color/spacing/font lives in `variables/`.
- ❌ **Do not introduce a CSS-in-JS library** — this codebase is plain CSS.
