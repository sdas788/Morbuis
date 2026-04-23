# Test Cases Kanban Board

**ID:** S-002-003
**Project:** morbius
**Epic:** E-002
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a tester, I want a Kanban board view of all test cases grouped by category, with filter controls for status and scenario type, so I can see at a glance which tests are passing, failing, flaky, or not yet run.

## Acceptance Criteria

**Given** test cases are loaded  
**When** I open the Test Cases tab  
**Then** cards are grouped by category with pass/fail/flaky/not-run/in-progress columns

**Given** I apply a status filter (e.g. "Fail")  
**When** the filter is active  
**Then** only cards with that status are shown; empty columns auto-hide

**Given** I toggle to Row mode  
**When** viewing the board  
**Then** test cases are shown as a flat sortable list (sort by ID, Status, Priority, Name, or Type)

**Given** I drag a card within a category  
**When** I drop it in a new position  
**Then** the order is persisted to the markdown file and a changelog entry is written

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
