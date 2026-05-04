# Story: Single HTTP Server + Dashboard Shell

**ID:** S-001-001
**Project:** morbius
**Epic:** E-001
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want a single Node.js HTTP server that serves the full Morbius dashboard as embedded HTML/CSS/JS, so the tool runs with `node dist/index.js serve` and opens in any browser with no build step.

## Acceptance Criteria

**Given** the server is started on port 3000  
**When** I open `http://localhost:3000`  
**Then** the full dashboard UI renders with sidebar navigation, 7 tabs, and the active project loaded

**Given** the server is running  
**When** a file in `data/` changes  
**Then** the dashboard reflects updated data on next API call (file-based, no caching layer)

## Implementation Notes

- Single TypeScript file server (`src/server.ts`) with all HTML/CSS/JS embedded as template literals
- No React, no build pipeline for the client — raw DOM manipulation
- Zinc-palette dark theme; black/white base with status-only color (pass=#45E0A8, fail=#E5484D, flaky=#F5A623)
- Keyboard shortcuts: `1-6` jump between tabs, `⌘K` or `/` for search, `Esc` to close panels

## Do Not Do

- Do not introduce a separate frontend build step (Vite, webpack, etc.)
- Do not require a database — all data reads from markdown files in `data/`

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
