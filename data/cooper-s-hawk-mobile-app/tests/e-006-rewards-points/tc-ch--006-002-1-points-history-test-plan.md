---
id: TC-CH--006-002-1
title: Points History — Test Plan
category: e-006-rewards-points
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-006-002
  - e-006
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-006-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-006-rewards-points/T-006-002-points-history.md
  source_checksum: 7d146fffee52aab0
---
## Steps
# Test Plan: Points History

**ID:** T-006-002
**Project:** ch-mobile
**Story:** S-006-002
**Epic:** E-006
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can open the Points History screen, see a chronologically ordered scrollable list of point transactions sourced from `GET /membership/{memberId}/points`, with each row showing location, reward source, and a `+` or `-` point value. Confirms the empty-state copy, error handling with retry, pull-to-refresh, the loading skeleton, and that no transaction-editing UI is exposed.

## Prerequisites

- Authenticated member account with multiple seeded point transactions (mix of awards and redemptions).
- Second authenticated member account with zero transactions for empty-state coverage.
- Network conditions controllable to force `GET /membership/{memberId}/points` failures.
- Pagination-friendly seed data (more than one page worth of entries) to verify lazy loading.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (title + back arrow) | TC-006-002-001 (P0) | ✓ |
| AC-002 (entry shape: location, source, +/-) | TC-006-002-001 (P0), TC-006-002-005 | ✓ |
| AC-003 (empty state copy) | TC-006-002-001 (P0), TC-006-002-002 | ✓ |
| AC-004 (error + retry) | TC-006-002-001 (P0), TC-006-002-003 | ✓ |
| AC-005 (pull-to-refresh reloads) | TC-006-002-001 (P0), TC-006-002-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-006-002-001: End-to-end Points History review including refresh, error recovery, and empty-state pivot

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** S-006-001 must be Done (entry point is "View History" on the Account screen)

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-account | default |
| loading | DS-poin

## Expected Result
# Test Plan: Points History

**ID:** T-006-002
**Project:** ch-mobile
**Story:** S-006-002
**Epic:** E-006
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can open the Points History screen, see a chronologically ordered scrollable list of point transactions sourced from `GET /membership/{memberId}/points`, with each row showing location, reward source, and a `+` or `-` point value. Confirms the empty-state copy, error handling with retry, pull-to-refresh, the loading skeleton, and that no transaction-editing UI is exposed.

## Prerequisites

- Authenticated member account with multiple seeded point transactions (mix of awards and redemptions).
- Second authenticated member account with zero transactions for empty-state coverage.
- Network conditions controllable to force `GET /membership/{memberId}/points` failures.
- Pagination-friendly seed data (more than one page worth of entries) to verify lazy loading.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (title + back arrow) | TC-006-002-001 (P0) | ✓ |
| AC-002 (entry shape: location, source, +/-) | TC-006-002-001 (P0), TC-006-002-005 | ✓ |
| AC-003 (empty state copy) | TC-006-002-001 (P0), TC-006-002-002 | ✓ |
| AC-004 (error + retry) | TC-006-002-001 (P0), TC-006-002-003 | ✓ |
| AC-005 (pull-to-refresh reloads) | TC-006-002-001 (P0), TC-006-002-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-006-002-001: End-to-end Points History review including refresh, error recovery, and empty-state pivot

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** S-006-001 must be Done (entry point is "View History" on the Account screen)

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-account | default |
| loading | DS-poin

