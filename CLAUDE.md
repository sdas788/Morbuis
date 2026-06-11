# Morbius — QA Dashboard

## Project Overview
Visual Kanban dashboard for Maestro + Claude Code mobile QA. Reads test cases from Excel, stores as markdown, displays as Kanban board with bug tracking.

## Architecture
- Single-file HTTP server with embedded HTML/CSS/JS (same pattern as PMAgent board.ts)
- Node.js + TypeScript, no frontend framework or build step for the UI; the dashboard JSX in `generateJS()` is precompiled server-side with esbuild at first request (falls back to in-browser Babel if the transform fails)
- Markdown files as database, screenshots stored locally
- Linear-style dark UI on OKLCh design tokens (light theme + accent presets included)

## Key Commands
- `npm run build` — compile TypeScript
- `npm start` — run the compiled server
- `npm run dev` — run with ts-node (development)
- `morbius serve --port 3000` — start dashboard
- `morbius import <xlsx-path>` — import Excel test cases to markdown
- `morbius export <xlsx-path>` — export dashboard changes back to Excel

## File Structure
- `src/types.ts` — all TypeScript interfaces
- `src/parsers/excel.ts` — Excel ↔ Markdown sync
- `src/parsers/markdown.ts` — frontmatter markdown read/write
- `src/parsers/maestro-yaml.ts` — Maestro YAML → human-readable
- `src/server.ts` — HTTP server + embedded dashboard UI
- `src/index.ts` — CLI entry point (commander)
- `data/` — markdown files, screenshots, run logs

## Design System
- Authoritative token values: `requirements/design-tokens.md`; tokens live as CSS custom properties in `generateCSS()` (src/server.ts), OKLCh color space, dark default + `[data-theme="light"]`
- Deep near-black base with a tight elevation ramp (`--bg` → `--bg-elev` → `--bg-elev-2` → `--bg-hover`), hairline alpha borders, 4-tier text (`--fg`/`-muted`/`-dim`/`-faint`), indigo-violet `--accent` with presets, 3-tier shadows (`sm`/`md`/`pop`)
- Status colors only signal real state: Pass `--ok`, Fail `--fail`, Flaky `--warn`. Never color a zero/not-run state (no red dots before a run has happened)
- Font: Inter + JetBrains Mono for code
- Editing UI: the whole dashboard is inside template literals — escape backticks, `${`, and regex backslashes in `generateJS()`
