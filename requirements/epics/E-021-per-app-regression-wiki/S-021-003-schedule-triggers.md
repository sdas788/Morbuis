# Story: Schedule Triggers + Next-Run Display

**ID:** S-021-003
**Project:** morbius
**Epic:** E-021
**Stage:** Draft
**Status:** Todo (DRIFT)
**Priority:** P4
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## ⚠ Drift

See E-021 drift flag.

---

## Story

As a QA lead, I want the regression plan to show when the next run is due and optionally to trigger it on schedule so that regressions happen predictably.

## Acceptance Criteria

**Given** a regression plan has a `schedule` cron expression in frontmatter
**When** the dashboard renders
**Then** the next run time is displayed prominently in the Regression tab and on the project overview

**Given** the schedule fires
**When** Morbius is running
**Then** the linked test suites are queued for execution; a run entry is created tagged `regression-run: true`

**Given** Morbius is not running when a schedule fires
**When** it next starts up
**Then** the missed run is detected and surfaced as a notification, not silently skipped

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
