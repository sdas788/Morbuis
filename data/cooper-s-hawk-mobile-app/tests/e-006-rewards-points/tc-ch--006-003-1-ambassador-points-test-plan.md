---
id: TC-CH--006-003-1
title: Ambassador Points — Test Plan
category: e-006-rewards-points
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-006-003
  - e-006
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-006-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-006-rewards-points/T-006-003-ambassador-points.md
  source_checksum: 323930282376afa7
---
## Steps
# Test Plan: Ambassador Points

**ID:** T-006-003
**Project:** ch-mobile
**Story:** S-006-003
**Epic:** E-006
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Ambassador points view shown at the second swipe position on the Account screen. Covers the animated semicircle graph on a 0-7,000 scale, the four level labels (0, Member, Ambassador, 7000 Elite), the dynamic "Progress to {next year} status" text, the info-icon link to the ambassador club page in an in-app browser, and the year-rollover behavior on January 1 (points reset, target year advanced, status updated when prior year totals crossed the 4,000-point Ambassador threshold). Confirms all members — ambassador or not — can see this view.

## Prerequisites

- Authenticated member fixtures seeded with varying ambassador balances: 0, 2,750, 4,000, and 7,000.
- Ability to set device clock for year-rollover scenarios (or backend able to mock "current year").
- In-app browser component installed and the ambassador URL reachable from the test environment.
- Account screen swipe gesture available (depends on S-006-001 being Done).

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (animate 0 → balance, 0–7000 scale) | TC-006-003-001 (P0), TC-006-003-006 | ✓ |
| AC-002 (level labels: 0, Member, Ambassador, 7000 Elite) | TC-006-003-001 (P0), TC-006-003-002 | ✓ |
| AC-003 ("Progress to 2026 status" when current year = 2025) | TC-006-003-001 (P0), TC-006-003-003 | ✓ |
| AC-004 (info icon opens ambassador club page) | TC-006-003-001 (P0), TC-006-003-007 | ✓ |
| AC-005 (Jan 1 rollover: points reset, target year +1) | TC-006-003-004 | ✓ |
| AC-006 (Jan 1: 4,000+ prior year → Ambassador status, 0 points to next year) | TC-006-003-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-006-003-001: End-to-end Ambassador view inspection durin

## Expected Result
# Test Plan: Ambassador Points

**ID:** T-006-003
**Project:** ch-mobile
**Story:** S-006-003
**Epic:** E-006
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Ambassador points view shown at the second swipe position on the Account screen. Covers the animated semicircle graph on a 0-7,000 scale, the four level labels (0, Member, Ambassador, 7000 Elite), the dynamic "Progress to {next year} status" text, the info-icon link to the ambassador club page in an in-app browser, and the year-rollover behavior on January 1 (points reset, target year advanced, status updated when prior year totals crossed the 4,000-point Ambassador threshold). Confirms all members — ambassador or not — can see this view.

## Prerequisites

- Authenticated member fixtures seeded with varying ambassador balances: 0, 2,750, 4,000, and 7,000.
- Ability to set device clock for year-rollover scenarios (or backend able to mock "current year").
- In-app browser component installed and the ambassador URL reachable from the test environment.
- Account screen swipe gesture available (depends on S-006-001 being Done).

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (animate 0 → balance, 0–7000 scale) | TC-006-003-001 (P0), TC-006-003-006 | ✓ |
| AC-002 (level labels: 0, Member, Ambassador, 7000 Elite) | TC-006-003-001 (P0), TC-006-003-002 | ✓ |
| AC-003 ("Progress to 2026 status" when current year = 2025) | TC-006-003-001 (P0), TC-006-003-003 | ✓ |
| AC-004 (info icon opens ambassador club page) | TC-006-003-001 (P0), TC-006-003-007 | ✓ |
| AC-005 (Jan 1 rollover: points reset, target year +1) | TC-006-003-004 | ✓ |
| AC-006 (Jan 1: 4,000+ prior year → Ambassador status, 0 points to next year) | TC-006-003-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-006-003-001: End-to-end Ambassador view inspection durin

