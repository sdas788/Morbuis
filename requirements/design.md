# Design Brief: Morbius

**Project:** morbius
**Version:** 1.0
**Updated:** 2026-04-21

---

## Design Philosophy

Morbius is a **developer-first tool**. The design is deliberately monochrome — the only color in the UI is status. Pass is green, fail is red, flaky is amber. Everything else is black, white, and grey. This means test results stand out immediately on any screen, in any context, without visual noise competing for attention.

**Three rules:**
1. Color = status only. Never use color for decoration.
2. Typography does the heavy lifting. Weight and size create hierarchy, not color.
3. Dense information over empty space. QA boards have a lot of data — pack it in legibly.

---

## Color System

Colors are defined in OKLCh (perceptual color space) as CSS variables, with full dark and light themes.

### Dark Theme (default)

| Token | OKLCh | Approx Hex | Use |
|-------|-------|-----------|-----|
| `--bg` | oklch(0.16 0.01 270) | `#0a0a0a` | Page background |
| `--bg-elev` | oklch(0.19 0.012 270) | `#141414` | Cards, panels |
| `--bg-elev-2` | oklch(0.22 0.014 270) | `#1e1e1e` | Nested surfaces |
| `--bg-hover` | oklch(0.24 0.016 270) | `#282828` | Hover states |
| `--bg-sunken` | oklch(0.13 0.008 270) | `#060606` | Inputs, code blocks |
| `--border` | oklch(0.28 0.012 270) | `#363636` | Subtle dividers |
| `--border-strong` | oklch(0.36 0.014 270) | `#4d4d4d` | Active/focus borders |
| `--fg` | oklch(0.98 0.002 270) | `#fafafa` | Primary text |
| `--fg-muted` | oklch(0.75 0.008 270) | `#c0c0c0` | Secondary text |
| `--fg-dim` | oklch(0.56 0.01 270) | `#8f8f8f` | Tertiary/placeholder |
| `--fg-faint` | oklch(0.42 0.01 270) | `#6a6a6a` | Disabled/hint |

### Light Theme

| Token | OKLCh | Approx Hex | Use |
|-------|-------|-----------|-----|
| `--bg` | oklch(0.985 0.003 90) | `#fafaf8` | Page background |
| `--fg` | oklch(0.18 0.01 270) | `#2d2d2d` | Primary text |
| *(other tokens scale accordingly)* | | | |

### Status Colors (same in both themes)

| Token | OKLCh | Hex | Use |
|-------|-------|-----|-----|
| `--ok` | oklch(0.72 0.16 155) | `#45E0A8` | Pass — test passed, bug fixed |
| `--fail` | oklch(0.68 0.22 25) | `#E5484D` | Fail — test failed, critical bug |
| `--warn` | oklch(0.78 0.15 75) | `#F5A623` | Flaky — intermittent, needs attention |
| `--info` | oklch(0.72 0.15 235) | `#4A90E2` | Info — informational, Jira-synced |
| `--accent` | oklch(0.68 0.17 285) | `#A78BFA` | Accent — active state, CTA (violet default) |

**Rule:** Status colors are used only for badges, progress bars, health indicators, and pass/fail states. Never use them for backgrounds, borders, or decorative elements.

---

## Typography

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| UI / Body | **Inter** | 400, 500, 600, 700 | All labels, body text, buttons, nav |
| Code / YAML | **JetBrains Mono** | 400, 500, 600 | YAML viewer, code blocks, IDs, paths |

Source: Google Fonts (preconnect + stylesheet in `<head>`).

**Scale:**
- `11px / 500` — metadata, timestamps, badges
- `12px / 400` — secondary labels, table cells
- `13px / 500` — card titles, field labels
- `14px / 400` — body text, notes
- `16px / 600` — section headings
- `20px / 700` — tab headings, metric values
- `32px+ / 700` — hero numbers (overall pass %)

---

## Layout + Navigation

**Sidebar** (desktop): Fixed left sidebar with project switcher at top, 7 tab icons + labels, theme toggle at bottom. Width: ~200px.

**Top nav** (mobile): Collapses sidebar to icon-only top bar with number shortcut labels.

**Keyboard shortcuts:**
| Key | Action |
|-----|--------|
| `1` | Dashboard tab |
| `2` | Test Cases tab |
| `3` | Bugs tab |
| `4` | Devices tab |
| `5` | Runs tab |
| `6` | Maestro tab |
| `7` | Settings tab |
| `⌘K` or `/` | Global search (fuse.js) |
| `Esc` | Close any open panel |

---

## Component Patterns

### Status Pills
Rounded badges showing test/bug status. Color-coded by `--ok` / `--fail` / `--warn`. Click to update inline.

```
[ ● Pass ]   [ ● Fail ]   [ ◑ Flaky ]   [ — Not Run ]   [ ⟳ In Progress ]
```

### Kanban Columns
Cards grouped by category (Test Cases) or status (Bugs). Column headers show count. Drag-to-reorder within category. Empty columns auto-hide when filters are active.

### Detail Drawer
Slides in from the right when a card is clicked. Shows: full title, linked IDs, all fields, screenshot (if bug), step list (if test), changelog table, notes textarea (auto-save). Has a chat toggle to open the Claude Code pane.

### Health Bars
Per-category horizontal bars: green segment (pass) + red segment (fail) + amber segment (flaky) + grey (not-run). Percentage label on right.

### Metric Cards
Single large number with label and trend direction. Used on Dashboard for: overall pass %, open bugs, total tests, coverage %.

### YAML Viewer
Syntax-highlighted code block (JetBrains Mono). Fragile selector warnings shown as amber inline annotations. Run button top-right. Human-readable step list alongside raw YAML.

### Live Run Log
Streams Maestro output via WebSocket. Steps appear line-by-line with status icon (✓ pass, ✗ fail, ⟳ running). Auto-scrolls to bottom.

### Chat Drawer
Slide-out panel from the right. Input at bottom, streaming response above. Suggestion chips for quick actions. Connects to `/ws/chat`.

---

## Dashboard Views

### 1 — Dashboard Overview
Grid of metric cards + category health bars + flaky test list + recent activity feed + coverage gap warnings. PM-facing. No interaction except clicking through to detail.

### 2 — Test Cases Kanban
Filter bar (status chips + scenario type chips) + sort bar (ID / Status / Priority / Name / Type). Board mode (cards) or Row mode (list). Cards show: ID, title, status pill, priority badge, platform icons, maestro flow indicator.

### 3 — Bug Board
Four columns: Open / Investigating / Fixed / Closed. Bug cards show: title, linked test, device, priority badge, screenshot thumbnail, Jira badge ("J") if synced. Click to open detail drawer.

### 4 — Device Matrix
Scrollable grid: devices as columns, tests as rows. Cell = coloured dot (pass/fail/not-run). Column header = device name + pass rate. Sortable by test ID, name, or pass rate.

### 5 — Runs History
List of run records: run ID, timestamp, device, pass/fail count, duration. Click to expand per-test results. Media gallery tab shows screenshots and video recordings.

### 6 — Maestro Flows
File browser (Android / iOS toggle). Flow cards: name, step count, linked test IDs, fragile selector warning count. Click to open YAML viewer + human-readable steps. Run button per flow. Full suite runner at top.

### 7 — Settings
Sectioned form: Profile → Workspace → Integrations → Devices → Maestro → Test Runs → Appearance → Data → Danger Zone. All changes POST to `/api/config/update`. Theme toggle and accent colour picker in Appearance.

---

## UI States

Every interactive element must handle:
- **Default** — resting state
- **Hover** — `--bg-hover` background, cursor pointer
- **Active/Focus** — `--border-strong` outline, `--accent` highlight
- **Loading** — spinner + elapsed time (for run buttons); skeleton shimmer (for data loads)
- **Empty** — placeholder message with action hint (e.g. "No bugs yet — run a test suite to get started")
- **Error** — red inline message with retry option

---

## Accessibility

- Keyboard navigable: all tabs, buttons, and form fields reachable via Tab/Enter
- ARIA labels on icon-only buttons
- Status colors never rely on color alone — always paired with text label or icon
- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI components

---

## Coding Agent Checklist

When implementing new UI in `src/server.ts`:
- [ ] Use CSS variables (`--bg`, `--fg`, etc.) — never hardcode hex values
- [ ] Status colors only for status (`--ok`, `--fail`, `--warn`) — not for decorative use
- [ ] New components follow the existing inline React pattern (no separate files, no JSX transpile step — use `h()` or `React.createElement()`)
- [ ] All new routes follow the existing `if (pathname === '/api/...')` pattern in the request handler
- [ ] Changelog entries written for every field mutation (test case or bug)
- [ ] Empty/loading/error states implemented for every new data view

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
