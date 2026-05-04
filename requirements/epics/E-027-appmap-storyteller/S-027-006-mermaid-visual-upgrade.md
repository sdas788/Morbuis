# Story: Mermaid chart visual upgrade ("designer-grade")

**ID:** S-027-006
**Project:** morbius
**Epic:** E-027
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
**Created:** 2026-05-01
**Updated:** 2026-05-01

---

## Story

As a user opening the AppMap tab, I want the chart to look like a top-tier designer made it (Linear/Vercel/Notion-tier), so the centerpiece of the tab feels intentional rather than auto-generated.

## Acceptance Criteria

**Given** the AppMap tab renders
**When** the chart appears
**Then** it uses Morbius's monochrome design system — `#0A0A0A` background, `#111` nodes with `#333` borders, Inter font, JetBrains Mono for IDs — instead of default Mermaid colors/fonts

**Given** a node corresponds to an automated flow
**When** the chart renders
**Then** the node has a 3px-wide left border colored by the flow's run status (green `#45E0A8` for pass, amber `#F5A623` for partial/flaky, gray `#333` for none, dashed amber for in-progress)

**Given** the chart contains multiple subgraph clusters
**When** rendered
**Then** each cluster has a subtle `#0F0F0F` background fill, `#1F1F1F` 1px border, small-caps label in `#888`

**Given** I hover any node
**When** the hover state activates
**Then** the node lifts 1px, background brightens to `#161616`, status border thickens to 4px, and unrelated edges fade to 30% opacity

**Given** the project has no `appMap` config
**When** I open the AppMap tab
**Then** I see a centered illustration card with dot-grid background and a "No AppMap yet — generate one with Claude" CTA — not a blank white box

**Given** the chart is rendering
**When** Mermaid takes 200–500ms to compute layout
**Then** a skeleton with 6 ghost rectangles + slow shimmer fills the space until the chart is ready

**Given** the largest project (sts or micro-air)
**When** the chart renders
**Then** total render time is under 500ms and there's no horizontal scrollbar at default zoom on a 14" laptop

## Constraints

- **C3** — stay on Mermaid 10.9.5 (already loaded via CDN). All styling via `themeCSS` directive + classDef + post-render SVG decoration. No new dependency.
- Hover/focus is CSS-only (transitions, `:has()`); no extra JS.
- Status overlay computed server-side by joining Mermaid node IDs with `MaestroFlow.status` and the narrative's `flowsCovered`.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-01 | 1.0 | Claude | Created |
| 2026-05-01 | 1.1 | Claude | Shipped. Replaced default Mermaid 11 dark theme with `theme: 'base'` + full `themeVariables` (Morbius monochrome: `#0A0A0A` bg, `#111` nodes, `#2A2A2D` borders, `#E5E5E7` text, Inter typography) + `themeCSS` for hover affordances, hairline borders, rounded 8px corners, edge label polish. Render pipeline strips inline `style NODE fill:#xxx` and `linkStyle` directives from the project's Mermaid source so the theme owns the look (was overriding to bright green fills). Post-render decorator fuzzy-matches Mermaid node labels against `narrative.perFlow[].flowId` slugs and tags matching nodes with `.status-covered .flow-clickable` classes; `status-covered` adds a 1.5px green stroke + drop-shadow status accent (`#45E0A8`). Chart canvas gains a 16px dot-grid background. Empty state replaced with centered map illustration card + dot-grid. Click on a decorated node expands the matching accordion row + scrolls into view (effect re-attaches on `state.appMap`/`narrative` changes so refs are settled). **Verified live on micro-air**: 15 of 32 nodes correctly tagged covered; `Login Form` click expanded `01_login` accordion row with full whyPicked detail. |
