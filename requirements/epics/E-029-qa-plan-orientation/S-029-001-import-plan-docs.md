# Story: Import PMAgent QA / Flow / Release / User-Flow Docs

**ID:** S-029-001
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

As a QA lead, I want the product team's QA Plan, Flow Plans, Release Plans, and User Flows pulled into Morbius on the same one-click push as the test cases so that the QA team sees the roadmap, not just the cases — with no extra engineering load per sync.

## Acceptance Criteria

**Given** a PMAgent project with `qa/`, `releases/`, and user-flow docs
**When** the push-to-Morbius transfer runs
**Then** those docs are copied verbatim into `data/<project>/plans/` and indexed (`importPMAgentPlans` / `parsePlanDoc` / `plans.json`)

**Given** the imported plans
**When** the dashboard requests them
**Then** `/api/plans` returns the index and `/api/plans/:id` returns the body + parsed sections, guarded against path traversal

## Implementation Notes (as built)

`importPMAgentPlans`, `parsePlanDoc`, `planMetaFromFile`, `loadPlansIndex`, `extractPlanSections` in `src/server.ts`; `/api/plans` + `/api/plans/:id` routes (traversal guard `^[A-Za-z0-9_.-]+\.md$`). Verified: 18 plan docs imported on road-scholar-mobile.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
