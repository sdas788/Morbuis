# Design Tokens — Morbius

**Version:** 1.0
**Updated:** 2026-04-21
**Project:** morbius

> Authoritative token values for Morbius dashboard UI. All values defined as CSS custom properties in `generateCSS()` in `src/server.ts` using OKLCh color space. Approximate hex values listed here for reference and tooling handoff.

---

## Color Tokens — Dark Theme (Default)

| Token | Value | Notes |
|-------|-------|-------|
| Background | `#0a0a0a` | Page background — `--bg` |
| Surface | `#141414` | Cards, panels — `--bg-elev` |
| Surface Raised | `#1e1e1e` | Nested surfaces, modals — `--bg-elev-2` |
| Surface Hover | `#282828` | Hover states — `--bg-hover` |
| Surface Sunken | `#060606` | Inputs, code blocks — `--bg-sunken` |
| Border | `#363636` | Subtle dividers — `--border` |
| Border Strong | `#4d4d4d` | Active / focus borders — `--border-strong` |
| Foreground | `#fafafa` | Primary text — `--fg` |
| Foreground Muted | `#c0c0c0` | Secondary text — `--fg-muted` |
| Foreground Dim | `#8f8f8f` | Tertiary / placeholder — `--fg-dim` |
| Foreground Faint | `#6a6a6a` | Disabled / hint — `--fg-faint` |

## Color Tokens — Status (Both Themes)

| Token | Value | Notes |
|-------|-------|-------|
| Pass | `#45E0A8` | Test passed, bug fixed — `--ok` |
| Fail | `#E5484D` | Test failed, critical bug — `--fail` |
| Flaky | `#F5A623` | Intermittent / needs attention — `--warn` |
| Info | `#4A90E2` | Informational, Jira-synced badge — `--info` |
| Accent | `#A78BFA` | Active state, CTA, focus ring — `--accent` |

## Color Tokens — Light Theme

| Token | Value | Notes |
|-------|-------|-------|
| Background Light | `#fafaf8` | Page background in light mode — `--bg` |
| Foreground Light | `#2d2d2d` | Primary text in light mode — `--fg` |

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
