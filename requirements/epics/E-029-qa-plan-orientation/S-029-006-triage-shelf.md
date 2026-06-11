# Story: Triage Shelf — Quarantine Raw / Meta Epics

**ID:** S-029-006
**Project:** morbius
**Epic:** E-029
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA tester, I want meta epics (about building the QA harness, not app features) and raw un-curated imports kept out of my default worklist so that the board is a real worklist, not a grey wall of noise.

## Acceptance Criteria

**Given** a project declares `reviewEpics` (category-slug prefixes) on its registry entry
**When** I open Test Cases
**Then** those cards are flagged "needs review" and excluded from the default **Ready** worklist — kept on disk, one click away under a "⚠ Needs review — raw import" shelf

**Given** a meta epic (e.g. QA Test Automation scaffolding)
**When** it is quarantined
**Then** it stays quarantined and does not inflate coverage or pollute Ready

## Implementation Notes (as built)

`reviewEpics?: string[]` on `ProjectConfig` (`src/types.ts`); Triage Shelf toggle + shelf + `dedupeTestPlanBody` in `TestsView` (`src/server.ts`). Verified: E-009 quarantined on road-scholar-mobile.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
