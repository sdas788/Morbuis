# Story: Dashboard Overview Tab

**ID:** S-001-004
**Project:** morbius
**Epic:** E-001
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a PM stakeholder, I want a dashboard overview tab that shows overall pass rate, per-category health bars, flaky test rankings, device coverage, recent activity, and coverage gaps — so I can understand QA health at a glance without opening any individual test.

## Acceptance Criteria

**Given** tests have run results  
**When** I open the Dashboard tab  
**Then** I see: overall pass % (single number), category health bars (pass/fail/flaky per category), top flaky tests, device coverage by device, last 20 activity events, and coverage gap warnings

**Given** no tests have been run yet  
**When** I open the Dashboard tab  
**Then** the pass rate shows 0% and coverage gaps highlight all tests as not-run

**Given** a test fails  
**When** the activity feed refreshes  
**Then** the failure appears in the Recent Activity section within the same session

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
