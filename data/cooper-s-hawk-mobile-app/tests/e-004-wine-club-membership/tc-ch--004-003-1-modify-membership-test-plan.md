---
id: TC-CH--004-003-1
title: Modify Membership — Test Plan
category: e-004-wine-club-membership
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-004-003
  - e-004
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-004-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-004-wine-club-membership/T-004-003-modify-membership.md
  source_checksum: 1ccc8afb8a04fb48
---
## Steps
# Test Plan: Modify Membership

**ID:** T-004-003
**Project:** ch-mobile
**Story:** S-004-003
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that an eligible Wine Club member can edit their membership tier and club type from the Club Benefits edit icon, see prices update dynamically per bottle/club-type combination, save with "Update my membership" (which calls `PUT /membership/{id}`), see the in-process confirmation text, cancel without saving, and that ineligible statuses (Inactive, Cancel, Expired gift) do not see the edit icon while eligible statuses (New, Will Charge, Active, UTP, Vacation Hold) do.

## Prerequisites

- Staging environment with seeded test members for each eligibility status (New, Will Charge, Active, UTP, Vacation Hold) and each ineligible status (Inactive, Cancel, Expired gift)
- `PUT /membership/{id}` reachable; `GET /membership/pricing` returns deterministic prices for all bottle/club-type combinations
- Each eligible test member has a valid Card on File so the change can be processed at next billing
- App build includes Club Benefits and the Edit Wine Club Info screen

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (edit screen shows current bottle + type selected) | TC-004-003-001 (P0) | ✓ |
| AC-002 (price updates on bottle toggle) | TC-004-003-001 (P0) | ✓ |
| AC-003 (price updates on club type toggle) | TC-004-003-001 (P0), TC-004-003-002 | ✓ |
| AC-004 (Update my membership saves and returns) | TC-004-003-001 (P0) | ✓ |
| AC-005 (in-process text on benefits screen) | TC-004-003-001 (P0) | ✓ |
| AC-006 (Cancel returns without saving) | TC-004-003-003 | ✓ |
| AC-007 (Inactive/Cancel/Expired don't see edit icon) | TC-004-003-004 | ✓ |
| AC-008 (New/Will Charge/UTP/Vacation Hold see edit) | TC-004-003-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing

## Expected Result
# Test Plan: Modify Membership

**ID:** T-004-003
**Project:** ch-mobile
**Story:** S-004-003
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that an eligible Wine Club member can edit their membership tier and club type from the Club Benefits edit icon, see prices update dynamically per bottle/club-type combination, save with "Update my membership" (which calls `PUT /membership/{id}`), see the in-process confirmation text, cancel without saving, and that ineligible statuses (Inactive, Cancel, Expired gift) do not see the edit icon while eligible statuses (New, Will Charge, Active, UTP, Vacation Hold) do.

## Prerequisites

- Staging environment with seeded test members for each eligibility status (New, Will Charge, Active, UTP, Vacation Hold) and each ineligible status (Inactive, Cancel, Expired gift)
- `PUT /membership/{id}` reachable; `GET /membership/pricing` returns deterministic prices for all bottle/club-type combinations
- Each eligible test member has a valid Card on File so the change can be processed at next billing
- App build includes Club Benefits and the Edit Wine Club Info screen

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (edit screen shows current bottle + type selected) | TC-004-003-001 (P0) | ✓ |
| AC-002 (price updates on bottle toggle) | TC-004-003-001 (P0) | ✓ |
| AC-003 (price updates on club type toggle) | TC-004-003-001 (P0), TC-004-003-002 | ✓ |
| AC-004 (Update my membership saves and returns) | TC-004-003-001 (P0) | ✓ |
| AC-005 (in-process text on benefits screen) | TC-004-003-001 (P0) | ✓ |
| AC-006 (Cancel returns without saving) | TC-004-003-003 | ✓ |
| AC-007 (Inactive/Cancel/Expired don't see edit icon) | TC-004-003-004 | ✓ |
| AC-008 (New/Will Charge/UTP/Vacation Hold see edit) | TC-004-003-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing

