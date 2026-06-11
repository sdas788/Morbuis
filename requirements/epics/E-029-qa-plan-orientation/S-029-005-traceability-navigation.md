# Story: Traceability Round-Trip Navigation

**ID:** S-029-005
**Project:** morbius
**Epic:** E-029
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA lead, I want to navigate between a story's test cases, the flow that automates them, and the plan that covers them — in both directions — so that I can trace coverage without losing my place.

## Acceptance Criteria

**Given** a plan detail
**When** I click a covered story / flow chip
**Then** I jump to the focused Test Cases (filtered to that story) or the focused Maestro flow, and the test plan's "In QA plans" chips jump back to the covering plan

**Given** any focused navigation
**When** I navigate elsewhere via the sidebar / top nav / search
**Then** the focus filter clears cleanly (no stale filter leaking across views)

## Implementation Notes (as built)

`handleNavigate(view, opts {story|flow|plan})`, `focusStory` / `focusFlow` / `focusPlan`, `navFilter` / `navTo` in `src/server.ts`; covering-plan chips in `TestPlanDetail`; Sidebar / Topnav / TestDrawer / SearchModal all route through `navTo` so the filter resets.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
