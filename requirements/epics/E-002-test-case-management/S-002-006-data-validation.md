# Story: Data Validation + Integrity Checks

**ID:** S-002-006
**Project:** morbius
**Epic:** E-002
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want to run `morbius validate` and get a report of all data integrity issues — broken Maestro paths, orphaned screenshots, missing linked tests, stale tests — so I can catch configuration drift before it causes silent failures.

## Acceptance Criteria

**Given** a test case has a maestroFlow path that no longer exists  
**When** I run `morbius validate`  
**Then** it is reported as a broken Maestro flow link

**Given** a bug has a screenshot path that doesn't exist on disk  
**When** I run `morbius validate`  
**Then** it is reported as a missing screenshot

**Given** a test has not been run in more than 7 days  
**When** I run `morbius validate`  
**Then** it is flagged as stale

**Given** all data is clean  
**When** I run `morbius validate`  
**Then** the output shows "No issues found"

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
