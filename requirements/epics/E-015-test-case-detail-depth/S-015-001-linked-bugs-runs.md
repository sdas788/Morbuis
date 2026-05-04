# Story: Linked Bugs + Run History Panel

**ID:** S-015-001
**Project:** morbius
**Epic:** E-015
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want to see all linked bugs and recent run history inside the test case detail view so that I don't have to navigate away to understand a test's current state.

## Acceptance Criteria

**Given** a test case is open in the detail view
**When** the panel renders
**Then** a "Linked Bugs" section shows all bugs that reference this test, with status and link to bug modal

**Given** a test case has been run
**When** the detail view renders
**Then** a "Run History" section shows the last 10 runs with date, device, result, and duration — sorted newest first

**Given** a run in history is clicked
**When** the click fires
**Then** the run detail opens in a side panel without losing the test case context

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: TestDrawer (`src/server.ts`) now (a) makes Linked Bugs rows clickable — clicking a bug opens BugDrawer in-place via new `onSelectBug` prop wired from `App` (test context preserved); (b) renders a new "Run history · N" section pulling real `MaestroRunRecord` data from existing `GET /api/runs/:testId/history` (last 10, newest first), with platform, failing-step summary, duration; clicking a row expands an inline detail panel with full runId/timestamps/exit-code/error line/screenshot path. Side fix: moved `aS`/`aE` hooks above the `if (!test) return null` early return to satisfy React's Rules of Hooks. AC1, AC2, AC3 met. |
