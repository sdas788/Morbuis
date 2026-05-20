---
id: TC-CH--007-007-1
title: Account Status Alerts — Test Plan
category: e-007-payments-account-management
scenario: Edge Case
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-007-007
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-007
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-007-account-status-alerts.md
  source_checksum: 10b8ba38b5415a1b
---
## Steps
# Test Plan: Account Status Alerts

**ID:** T-007-007
**Project:** ch-mobile
**Story:** S-007-007
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the red persistent alert banner system on the Account screen for non-standard membership statuses: UTP shows a banner on Payment Methods plus a red badge on the Account "Payment Methods" menu item; Inactive and Canceled show the rejoin banner under the points chart; Vacation Hold shows a tappable Member Services click-to-call banner with the hold end date; Active/New/Will Charge show no banner; switching memberships in the dropdown refreshes the banner; the banner is not dismissible.

## Prerequisites

- Test member accounts (or a test back-end with stagable membership status) for each status: UTP, Inactive, Canceled, Vacation Hold (with a known endDate), Active, New, Will Charge
- Multi-membership account with two memberships in different statuses for the dropdown switch test
- Device with the native phone dialer available (iOS simulator's tel: handler or a physical device for the click-to-call test)
- App authenticated for each status under test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (UTP: red badge + banner on Payment Methods) | TC-007-007-001 (P0), TC-007-007-002 | ✓ |
| AC-002 (Inactive/Canceled rejoin banner under points chart) | TC-007-007-001 (P0), TC-007-007-003 | ✓ |
| AC-003 (Vacation Hold banner with date + click-to-call) | TC-007-007-001 (P0), TC-007-007-004 | ✓ |
| AC-004 (multi-membership dropdown refreshes banner) | TC-007-007-001 (P0), TC-007-007-005 | ✓ |
| AC-005 (Active: no banner) | TC-007-007-001 (P0), TC-007-007-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-007-001: Member cycles through every membership status and verifies banner placement, copy, action, dropdown refresh, and 

## Expected Result
# Test Plan: Account Status Alerts

**ID:** T-007-007
**Project:** ch-mobile
**Story:** S-007-007
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the red persistent alert banner system on the Account screen for non-standard membership statuses: UTP shows a banner on Payment Methods plus a red badge on the Account "Payment Methods" menu item; Inactive and Canceled show the rejoin banner under the points chart; Vacation Hold shows a tappable Member Services click-to-call banner with the hold end date; Active/New/Will Charge show no banner; switching memberships in the dropdown refreshes the banner; the banner is not dismissible.

## Prerequisites

- Test member accounts (or a test back-end with stagable membership status) for each status: UTP, Inactive, Canceled, Vacation Hold (with a known endDate), Active, New, Will Charge
- Multi-membership account with two memberships in different statuses for the dropdown switch test
- Device with the native phone dialer available (iOS simulator's tel: handler or a physical device for the click-to-call test)
- App authenticated for each status under test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (UTP: red badge + banner on Payment Methods) | TC-007-007-001 (P0), TC-007-007-002 | ✓ |
| AC-002 (Inactive/Canceled rejoin banner under points chart) | TC-007-007-001 (P0), TC-007-007-003 | ✓ |
| AC-003 (Vacation Hold banner with date + click-to-call) | TC-007-007-001 (P0), TC-007-007-004 | ✓ |
| AC-004 (multi-membership dropdown refreshes banner) | TC-007-007-001 (P0), TC-007-007-005 | ✓ |
| AC-005 (Active: no banner) | TC-007-007-001 (P0), TC-007-007-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-007-001: Member cycles through every membership status and verifies banner placement, copy, action, dropdown refresh, and 

