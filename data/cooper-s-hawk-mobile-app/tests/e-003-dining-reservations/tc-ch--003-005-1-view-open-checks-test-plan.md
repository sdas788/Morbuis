---
id: TC-CH--003-005-1
title: View Open Checks — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-005
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-005
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-005-view-open-checks.md
  source_checksum: 485fe76d0594284e
---
## Steps
# Test Plan: View Open Checks

**ID:** T-003-005
**Project:** ch-mobile
**Story:** S-003-005
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that authenticated members see open restaurant checks on the dashboard and the dedicated Open Checks screen. Confirms 30-second polling, pull-to-refresh, empty state, navigation to check detail, error-modal handling on a 500 response, and that guest users do not trigger the open-checks API but do log a Firebase analytics event.

## Prerequisites

- Staging environment with `/order/open-tickets` reachable.
- Test member account M1 with one open ticket pre-seeded for LOC-A (server name set, item count 4, total $74.50).
- Test member account M2 with no open tickets.
- Guest (unauthenticated) test session.
- Firebase analytics integration configured for staging (events visible in DebugView).
- Ability to mutate the seeded ticket server-side mid-test (add a line item, close the ticket).
- Ability to switch the `/order/open-tickets` endpoint to return 500 for a single test.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (open check replaces "Make a Reservation" card) | TC-003-005-001 (P0) | Yes |
| AC-002 (500 → error modal on dashboard) | TC-003-005-002 | Yes |
| AC-003 (list shows location, check number, total) | TC-003-005-001 (P0) | Yes |
| AC-004 (no open checks → empty state copy) | TC-003-005-003 | Yes |
| AC-005 (tap check → CheckDetail) | TC-003-005-001 (P0) | Yes |
| AC-006 (auto-refresh every 30s while screen active) | TC-003-005-001 (P0), TC-003-005-004 | Yes |
| AC-007 (pull-to-refresh updates list) | TC-003-005-001 (P0) | Yes |
| AC-008 (guest → no API call, Firebase event logged) | TC-003-005-005 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-005-001: Member sees open check on dashboard, opens list, polls u

## Expected Result
# Test Plan: View Open Checks

**ID:** T-003-005
**Project:** ch-mobile
**Story:** S-003-005
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that authenticated members see open restaurant checks on the dashboard and the dedicated Open Checks screen. Confirms 30-second polling, pull-to-refresh, empty state, navigation to check detail, error-modal handling on a 500 response, and that guest users do not trigger the open-checks API but do log a Firebase analytics event.

## Prerequisites

- Staging environment with `/order/open-tickets` reachable.
- Test member account M1 with one open ticket pre-seeded for LOC-A (server name set, item count 4, total $74.50).
- Test member account M2 with no open tickets.
- Guest (unauthenticated) test session.
- Firebase analytics integration configured for staging (events visible in DebugView).
- Ability to mutate the seeded ticket server-side mid-test (add a line item, close the ticket).
- Ability to switch the `/order/open-tickets` endpoint to return 500 for a single test.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (open check replaces "Make a Reservation" card) | TC-003-005-001 (P0) | Yes |
| AC-002 (500 → error modal on dashboard) | TC-003-005-002 | Yes |
| AC-003 (list shows location, check number, total) | TC-003-005-001 (P0) | Yes |
| AC-004 (no open checks → empty state copy) | TC-003-005-003 | Yes |
| AC-005 (tap check → CheckDetail) | TC-003-005-001 (P0) | Yes |
| AC-006 (auto-refresh every 30s while screen active) | TC-003-005-001 (P0), TC-003-005-004 | Yes |
| AC-007 (pull-to-refresh updates list) | TC-003-005-001 (P0) | Yes |
| AC-008 (guest → no API call, Firebase event logged) | TC-003-005-005 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-005-001: Member sees open check on dashboard, opens list, polls u

