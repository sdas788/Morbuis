# Linked Bugs + Run History Panel

**ID:** S-015-001
**Project:** morbius
**Epic:** E-015
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
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
