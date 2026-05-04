# Story: Coverage Gap Detection

**ID:** S-005-002
**Project:** morbius
**Epic:** E-005
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want Morbius to automatically detect coverage gaps — tests with no automation, categories with no tests, and tests not run in over a week — so I know where the QA blind spots are without manually auditing the board.

## Acceptance Criteria

**Given** a test case has no `maestroFlow` linked  
**When** the Dashboard loads  
**Then** it appears in Coverage Gaps as "no automation"

**Given** a category has zero test cases  
**When** the Dashboard loads  
**Then** it appears in Coverage Gaps as "empty category"

**Given** a test has a `lastRun` timestamp older than 7 days  
**When** the Dashboard loads  
**Then** it appears in Coverage Gaps as "stale — not run in X days"

**Given** a device has fewer than 50% of tests run against it  
**When** the Dashboard loads  
**Then** it appears in Coverage Gaps as "low device coverage"

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
