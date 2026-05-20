---
id: TC-CH--003-001-1
title: Browse Reservations — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-001
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-001-browse-reservations.md
  source_checksum: 7ecdff7f02b1247b
---
## Steps
# Test Plan: Browse Reservations

**ID:** T-003-001
**Project:** ch-mobile
**Story:** S-003-001
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can view upcoming and past reservations through the dashboard reservation tile and the dedicated Reservations list screen. Confirms correct sectioning (upcoming vs. past), sort order, tile-level actions (directions, edit), horizontal scroll for multiple upcoming reservations, empty state, pull-to-refresh, and the guest-user gate.

## Prerequisites

- A staging environment with the `/reservation` endpoint reachable.
- Test member account A with one upcoming confirmed reservation, one past reservation, and zero cancelled reservations in upcoming.
- Test member account B with three upcoming confirmed reservations at the same location.
- Test member account C with no reservations (upcoming or past).
- A guest (unauthenticated) test session.
- Device default mapping app installed (Apple Maps on iOS, Google Maps on Android).
- Member accounts have a preferred location set.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (dashboard tile replaces button) | TC-003-001-001 (P0) | Yes |
| AC-002 (multiple upcoming → horizontal scroll) | TC-003-001-001 (P0), TC-003-001-002 | Yes |
| AC-003 (directions icon opens mapping app) | TC-003-001-001 (P0), TC-003-001-003 | Yes |
| AC-004 (edit icon → reservation modify screen) | TC-003-001-001 (P0), TC-003-001-004 | Yes |
| AC-005 (upcoming list shows location/date/time/party/seating) | TC-003-001-001 (P0) | Yes |
| AC-006 (past reservations reverse chronological) | TC-003-001-001 (P0), TC-003-001-005 | Yes |
| AC-007 (no reservations → empty state with CTA) | TC-003-001-006 | Yes |
| AC-008 (pull-to-refresh reloads list) | TC-003-001-001 (P0), TC-003-001-007 | Yes |
| AC-009 (guest prompted to sign in) | TC-003-001-008 | Yes |

---

## Core Test Flow

## Expected Result
# Test Plan: Browse Reservations

**ID:** T-003-001
**Project:** ch-mobile
**Story:** S-003-001
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can view upcoming and past reservations through the dashboard reservation tile and the dedicated Reservations list screen. Confirms correct sectioning (upcoming vs. past), sort order, tile-level actions (directions, edit), horizontal scroll for multiple upcoming reservations, empty state, pull-to-refresh, and the guest-user gate.

## Prerequisites

- A staging environment with the `/reservation` endpoint reachable.
- Test member account A with one upcoming confirmed reservation, one past reservation, and zero cancelled reservations in upcoming.
- Test member account B with three upcoming confirmed reservations at the same location.
- Test member account C with no reservations (upcoming or past).
- A guest (unauthenticated) test session.
- Device default mapping app installed (Apple Maps on iOS, Google Maps on Android).
- Member accounts have a preferred location set.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (dashboard tile replaces button) | TC-003-001-001 (P0) | Yes |
| AC-002 (multiple upcoming → horizontal scroll) | TC-003-001-001 (P0), TC-003-001-002 | Yes |
| AC-003 (directions icon opens mapping app) | TC-003-001-001 (P0), TC-003-001-003 | Yes |
| AC-004 (edit icon → reservation modify screen) | TC-003-001-001 (P0), TC-003-001-004 | Yes |
| AC-005 (upcoming list shows location/date/time/party/seating) | TC-003-001-001 (P0) | Yes |
| AC-006 (past reservations reverse chronological) | TC-003-001-001 (P0), TC-003-001-005 | Yes |
| AC-007 (no reservations → empty state with CTA) | TC-003-001-006 | Yes |
| AC-008 (pull-to-refresh reloads list) | TC-003-001-001 (P0), TC-003-001-007 | Yes |
| AC-009 (guest prompted to sign in) | TC-003-001-008 | Yes |

---

## Core Test Flow

