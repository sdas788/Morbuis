# Morbius — QA Dashboard

## Project Overview
Visual Kanban dashboard for Maestro + Codex mobile QA. Reads test cases from Excel, stores as markdown, displays as Kanban board with bug tracking.

## Architecture
- Single-file HTTP server with embedded HTML/CSS/JS (same pattern as PMAgent board.ts)
- Node.js + TypeScript, no frontend framework
- Markdown files as database, screenshots stored locally
- Vercel-style monochrome design (pure black/white, only status colors)

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
- Background: #000000, Surface: #111111, Borders: #333333
- Text: #FFFFFF primary, #888888 secondary
- Only color = status: Pass #45E0A8, Fail #E5484D, Flaky #F5A623
- Font: Inter + JetBrains Mono for code
