# Story: Push Morbius Changes Back to Sheet

**ID:** S-019-004
**Project:** morbius
**Epic:** E-019
**Stage:** Draft
**Status:** Todo
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want Morbius edits (test status, notes) to push back to my Google Sheet so that the Sheet — which may be the team-facing artifact — stays current without manual re-entry.

## Acceptance Criteria

**Given** a bound Sheet and a test case edit in Morbius
**When** the edit is saved
**Then** the change is pushed to the corresponding sheet cell via `spreadsheets.values.update` within 30 seconds

**Given** the push succeeds
**When** the next pull runs
**Then** the change is not re-applied as a conflict (timestamp matches)

**Given** the push fails (permissions, rate limit)
**When** the failure occurs
**Then** the change is queued for retry (same pattern as E-013 replay queue) and the health panel shows pending pushes

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
