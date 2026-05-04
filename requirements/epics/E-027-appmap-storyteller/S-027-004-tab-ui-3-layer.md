# Story: AppMap tab UI — 3-layer

**ID:** S-027-004
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

As a user opening the AppMap tab, I want to see the chart, the project narrative, and per-flow detail in one continuous view, so I can grasp the full QA story without tab-switching.

## Acceptance Criteria

**Given** the active project has a generated narrative
**When** I open the AppMap tab
**Then** I see top-to-bottom: (1) the Mermaid chart, (2) a narrative panel with "Why these flows" + "What the agent learned" + a time-on-task strip, (3) a per-flow accordion with one row per flow

**Given** the active project has no narrative yet
**When** I open the AppMap tab
**Then** the chart still renders and the narrative section shows a "Generate narrative — explain why these flows are automated" CTA button calling `POST /api/appmap/narrative/generate`

**Given** the user clicks Refresh
**When** generation completes
**Then** the panel re-renders with a new `generatedAt`, and the previous content is overwritten

## Constraints

- Extend the existing `AppMapView()` at `src/server.ts:10694` — do NOT create a new view component.
- Reuse `<AgentPanel>` if it exists in `src/server.ts`; otherwise build it once here so E-016 / E-017 / E-018 can adopt it later (per arch.md "Agent Panel UI Pattern").
- Markdown rendering via the existing `marked` pipeline.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-01 | 1.0 | Claude | Created |
| 2026-05-01 | 1.1 | Claude | Shipped. Rewrote `AppMapView` in `src/server.ts` from a single chart card to three stacked cards: (1) Mermaid chart with zoom controls (unchanged logic), (2) "Why these flows" narrative panel with Generate/Refresh button, last-generated timestamp, two prose sections, time-on-task footer strip + flow/test-case counter, (3) per-flow accordion with one row per `narrative.perFlow[]` entry, expand-to-show `whyPicked` + `lastRunsSummary`. Empty state: prompt copy + primary "✨ Generate narrative" CTA. Quality-flag warning banner when Claude output is generic after retry. Helpers `fmtMs` + `fmtRelTime` for time formatting. Live verified on micro-air with the freshly-generated narrative — chart, narrative, and 15-row accordion all render together. |
| 2026-05-01 | 1.4 | Claude | **Light-mode fix** per user feedback ("fix the light mode words issues"). All hardcoded `rgba(...)` and hex colors in the narrative panel + per-flow accordion replaced with design tokens (`var(--bg-elev)`, `var(--border)`, `var(--fg)`, `var(--accent)`, `var(--warn)`, `var(--ok)`, `var(--accent-soft)`, `var(--ok-bg)`, `var(--warn-bg)`, `var(--bg-sunken)`). Critical fixes: (a) inline code chips (e.g. `01_login.yaml`) had `color:#C8C8CC` on `rgba(255,255,255,0.04)` — invisible on white; now `var(--fg)` on `var(--bg-elev)` with `var(--border)` outline. (b) Bullet list dividers were `rgba(255,255,255,0.04)` — now `var(--border)`. (c) Stats strip background was `rgba(255,255,255,0.012)` (invisible on white) — now `var(--bg-sunken)`. (d) Section header label colors (`#A599FF`, `#F5C26C`) replaced with `var(--accent)` / `var(--warn)` (deeper hues in light mode for contrast). (e) Per-flow accordion expand-tint went from `rgba(124,92,255,0.04)` to `var(--accent-soft)` (theme-adaptive). (f) Status pills now use `var(--ok-bg)` / `var(--bg-elev)`. (g) Quality-flag warning banner uses `var(--warn-bg)`. (h) Dot-grid radial gradients in chart canvas + empty state changed from `rgba(255,255,255,...)` to `var(--border)`. New CSS classes `.appmap-section-{violet,amber,green}-label` map to `var(--accent)`/`var(--warn)`/`var(--ok)`. **Verified live** in both themes: dark code chips read white-on-dark, light code chips read black-on-white. |
| 2026-05-01 | 1.3 | Claude | **UX revision #2** per user feedback ("icons look gimmicky, not real product"; "make it points not paragraphs"). Removed all decorative emoji from section headers, panel header, accordion header, empty-state illustration, and CTA button (📖 🎯 💡 🗂 🗺 ✨ all gone). Section headers downgraded from h3-style with icon to small uppercase color-tinted labels (violet `#A599FF` for "Why these flows", amber `#F5C26C` for "What the agent learned"). Updated `buildAppMapPrompt` to require markdown bulleted lists for `whyTheseFlows` + `whatTheAgentLearned` (4-6 / 3-5 bullets, each leading with `- **Label:**`); `perFlow.whyPicked`/`lastRunsSummary` stay plain prose. New `.narrative-prose ul` CSS: list-style cleared, custom 6px dash bullet, hairline divider between rows, generous 8px vertical padding — list reads like a scannable feature comparison not prose. Verified live with regenerated narrative on micro-air: 11 bullets across the two sections, each with a bold lead-in label like "**Selector fragility clusters on dynamic-content screens:**" → instant scan. |
| 2026-05-01 | 1.2 | Claude | **UX revision** per user feedback ("not explicit, confusing"). The wall of `pre-wrap` text with raw `**bold**` and `` `code` `` markers was unscannable. Changes: (a) loaded `marked@12` via CDN; new `mdToHtml(src)` helper renders Claude's markdown to HTML (with a small inline fallback for offline). (b) Added `<StatCard>` component + 4-column stats strip at the top of the panel — `15 flows / 9.4% coverage / 1m 11s generation / 0ms runs` — big tabular numbers, clear labels, single green accent on the headline metric. (c) Two narrative sections each get an icon (🎯/💡) + heading + subtitle + colored border-left strip (violet for "Why these flows" — project-level rationale; amber for "What the agent learned" — observations). (d) Per-flow accordion polished: monospace flow IDs, refined "NO RUNS" status chip (uppercase, letter-spacing, subtle border), 3px left accent that flips violet when expanded, expanded body becomes a 2-column grid with violet/green caption labels. (e) New `.narrative-prose` CSS rules: paragraphs spaced, `<strong>` brightens, inline `<code>` becomes a mono chip with hairline border + dark background. (f) Empty-state CTA card got a softer illustration tile + clearer copy. Verified live: code chips render correctly for `05_add_hub_and_sensor.yaml`, `08_forgot_password`, `warnings=2` etc.; bold renders properly; markdown no longer leaks into the page. |
