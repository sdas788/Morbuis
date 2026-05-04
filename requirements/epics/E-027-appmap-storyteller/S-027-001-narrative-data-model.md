# Story: `AppMapNarrative` data model + read endpoint

**ID:** S-027-001
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

As Morbius, I need a typed `AppMapNarrative` shape persisted as a frontmatter markdown file under `data/{projectId}/appmap-narrative.md`, plus a read endpoint, so the AppMap tab can hydrate the narrative panel without calling Claude on every page load.

## Acceptance Criteria

**Given** a project with no narrative yet
**When** the client calls `GET /api/appmap/narrative`
**Then** it returns `{ narrative: null }` with HTTP 200

**Given** a project with `data/{projectId}/appmap-narrative.md` present
**When** the client calls `GET /api/appmap/narrative`
**Then** it returns `{ narrative: AppMapNarrative }` parsed from frontmatter + body, with all fields populated (projectId, generatedAt, flowsCovered, testCasesTotal, coveragePct, whyTheseFlows, whatTheAgentLearned, timeOnTask, perFlow[])

**Given** the parser has new helpers
**When** unit-tested via direct invocation
**Then** `writeAppMapNarrative()` round-trips through `readAppMapNarrative()` without data loss

## Constraints

- **C2** — mirror `writeBugImpact`/`readBugImpact` at `src/parsers/markdown.ts:543-564` exactly. Same frontmatter+body pattern.
- File location: `data/{projectId}/appmap-narrative.md` (project-level, single file, overwritten on regen).

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-01 | 1.0 | Claude | Created |
| 2026-05-01 | 1.1 | Claude | Shipped. Added `AppMapNarrative` + `AppMapPerFlow` types in `src/types.ts`. Added `writeAppMapNarrative` / `readAppMapNarrative` in `src/parsers/markdown.ts` mirroring the BugImpact pattern (frontmatter + body, single-file `data/{projectId}/appmap-narrative.md`, gray-matter for parse). Per-flow rows render as a markdown table; round-trip verified end-to-end. New `GET /api/appmap/narrative` returns `{ narrative: AppMapNarrative \| null }`; live response on micro-air = `{ narrative: null }` 200 OK. |
