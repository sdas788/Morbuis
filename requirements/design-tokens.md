# Design Tokens — Morbius

**Version:** 2.0
**Updated:** 2026-06-11
**Project:** morbius

> Authoritative token values for Morbius dashboard UI. All values defined as CSS custom properties in `generateCSS()` in `src/server.ts` using OKLCh color space (authoritative); approximate hex listed for reference and tooling handoff.

**v2 design intent:** deep near-black base (Linear/Vercel territory), tight elevation ramp, hairline *alpha* borders (white-alpha dark / black-alpha light) that blend over any surface, restrained violet-tinted neutrals (hue 275, chroma ≤ 0.01), and status/accent soft-backgrounds derived as alpha of the color itself so pairs stay in lockstep. Status color never decorates a zero or not-run state.

---

## Color Tokens — Dark Theme (Default)

| Token | Value (OKLCh) | ≈ Hex | Notes |
|-------|---------------|-------|-------|
| Background | `oklch(0.13 0.007 275)` | `#141417` | Page background — `--bg` |
| Surface | `oklch(0.165 0.008 275)` | `#1c1c20` | Cards, panels — `--bg-elev` |
| Surface Raised | `oklch(0.20 0.009 275)` | `#242428` | Nested surfaces, modals — `--bg-elev-2` |
| Surface Hover | `oklch(0.225 0.01 275)` | `#2a2a2f` | Hover states — `--bg-hover` |
| Surface Sunken | `oklch(0.105 0.006 275)` | `#0e0e11` | Inputs, code blocks — `--bg-sunken` |
| Border | `oklch(1 0 0 / 0.08)` | 8% white | Hairline dividers — `--border` |
| Border Strong | `oklch(1 0 0 / 0.15)` | 15% white | Active / hover borders — `--border-strong` |
| Foreground | `oklch(0.955 0.002 275)` | `#f2f2f4` | Primary text — `--fg` (off-white, kills halation) |
| Foreground Muted | `oklch(0.77 0.006 275)` | `#b8b8bf` | Secondary text — `--fg-muted` |
| Foreground Dim | `oklch(0.62 0.008 275)` | `#8d8d95` | Tertiary / placeholder — `--fg-dim` |
| Foreground Faint | `oklch(0.50 0.008 275)` | `#6b6b72` | Hints, group labels — `--fg-faint` |

## Color Tokens — Status (Dark / Light)

Soft backgrounds = the status color at 12% alpha (10–14% in light). Pill text and tint always derive from the same token.

| Token | Dark | Light | Notes |
|-------|------|-------|-------|
| Pass | `oklch(0.70 0.145 160)` | `oklch(0.545 0.135 160)` | `--ok` / `--ok-bg` |
| Fail | `oklch(0.64 0.19 24)` | `oklch(0.55 0.195 24)` | `--fail` / `--fail-bg` |
| Flaky | `oklch(0.76 0.135 80)` | `oklch(0.60 0.125 80)` | `--warn` / `--warn-bg` |
| Info | `oklch(0.69 0.125 240)` | `oklch(0.53 0.125 245)` | `--info` / `--info-bg` |
| Accent | `oklch(0.63 0.16 285)` | `oklch(0.51 0.16 285)` | `--accent` / `--accent-soft` — indigo-violet; presets: green/amber/blue at matching depth |

## Color Tokens — Light Theme

| Token | Value (OKLCh) | Notes |
|-------|---------------|-------|
| Background | `oklch(0.984 0.001 260)` | Neutral-cool paper (v1 warm hue-90 cream removed) — `--bg` |
| Surface | `oklch(1 0 0)` | White cards — `--bg-elev` |
| Border | `oklch(0 0 0 / 0.09)` | Hairline — `--border`; strong `/ 0.17` |
| Foreground | `oklch(0.215 0.012 275)` | Primary text — `--fg` |

## Elevation

| Token | Use |
|-------|-----|
| `--shadow-sm` | Card lift, buttons |
| `--shadow-md` | Dropdowns, menus |
| `--shadow-pop` | Drawers, modals, ⌘K palette, chat |

Elevated cards add `inset 0 1px 0 oklch(1 0 0 / 0.04)` (top catch-light). Primary buttons: vertical accent gradient + `inset 0 1px 0` highlight.

---

## Typography

| Token | Value | Notes |
|-------|-------|-------|
| Font: body | Inter (400, 500, 600, 700) | All labels, body text, buttons, nav |
| Font: mono | JetBrains Mono (400, 500, 600) | YAML viewer, code blocks, IDs, paths |

---

## Spacing & Radius

| Token | Value | Notes |
|-------|-------|-------|
| Base spacing unit | 4px | All spacing is a multiple of 4 |
| Corner radius (cards) | 6px | Test cards, bug cards |
| Corner radius (buttons) | 4px | Action buttons, status pills |
| Corner radius (modals) | 8px | Drawers, overlays, modals |
| Sidebar width | 200px | Fixed left sidebar (desktop) |

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created from src/server.ts generateCSS() |
| 2026-06-11 | 1.1 | Claude (design-critique pass) | Production polish: deduped generateCSS() (token/base block was pasted twice, ~950 lines); lifted `--fg-dim` 0.56→0.62 and `--fg-faint` 0.42→0.50 (dark) / 0.55→0.50 and 0.70→0.62 (light) for contrast; added `color-scheme`, `::selection`, global `:focus-visible` ring, thin scrollbars, `.chip-group`, `.empty-state`, drawer 2-row head, ⌘K pop-in, reduced-motion query; fixed undefined `var(--pass)` → `--ok` in live-pill. State-blind color fixes in JS (no red/amber zeros, gray dots until a category has runs). Server now precompiles JSX via esbuild at startup (production React, no in-browser Babel — DCL 1407ms→636ms). |
| 2026-06-11 | 2.0 | Claude (designer re-grade) | Full palette re-grade: base deepened 0.16→0.13 with tight elevation ramp; borders → hairline alpha (8%/15% white dark, 9%/17% black light); status colors deepened a step with alpha-derived soft bgs; accent → indigo-violet 0.63/0.51; light theme de-yellowed (hue 90→260). New `--shadow-pop` elevation tier (drawers/modals/palette); elevated cards = hairline + inset top catch-light; primary buttons = gradient + inset highlight; kanban card hover lift. UX: QA Plan heading registered (was falling back to "Settings"), persisted view key validated + self-heals, sidebar shortcut chips hover-reveal (read as fake counts), "— Test Plan" suffix stripped at projection (203×), all scripts deferred + app served at /app.js with ETag (HTML 401KB→66KB). |
