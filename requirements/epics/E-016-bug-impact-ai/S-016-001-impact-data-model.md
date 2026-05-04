# Story: Bug-Impact Markdown Data Model

**ID:** S-016-001
**Project:** morbius
**Epic:** E-016
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a developer working on E-016, I want a defined markdown data model for Bug-Impact analyses so that all downstream work (generation, storage, UI) has a stable contract.

## Acceptance Criteria

**Given** a bug exists at `data/{projectId}/bugs/bug-{id}.md`
**When** an impact analysis is generated
**Then** it is written to `data/{projectId}/bugs/{bugId}/impact.md` with frontmatter fields: `bugId`, `generatedAt`, `bugStatus`, `riskScore` (0.0–1.0)

**Given** the impact file has a body
**When** parsed
**Then** it contains sections: Related Tests (Rerun), Related Tests (Manual Verify After Fix), Repro Narrative — each section lists test IDs with rationale

**Given** the `BugImpact` TypeScript type is added to `src/types.ts`
**When** the type is referenced from server.ts or parsers
**Then** compile passes and the type matches the markdown schema

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: added `BugImpact` + `BugImpactRelatedTest` types in `src/types.ts`; added `writeBugImpact()` and `readBugImpact()` parsers in `src/parsers/markdown.ts`. Persists at `data/{projectId}/bugs/{bugId}/impact.md` with frontmatter `bugId / generatedAt / bugStatus / riskScore (0–1) / generatedBy / modelDurationMs` and three sections: Related Tests (Rerun), Related Tests (Manual Verify After Fix), Repro Narrative. Each related-test row is a markdown table cell with rationale. Round-trip smoke-tested via Node one-liner — write → read returns equivalent object. AC1 + AC2 + AC3 met. |
