---
id: TC-CH--003-003-1
title: Modify Reservation — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-003
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-003-modify-reservation.md
  source_checksum: b76383ac667c199a
---
## Steps
# Test Plan: Modify Reservation

**ID:** T-003-003
**Project:** ch-mobile
**Story:** S-003-003
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that a member can view full reservation detail, modify date/time/party-size via the booking flow, update special requests independently, and cancel a reservation through an explicit confirmation dialog. Confirms that cancelled and past reservations correctly hide the modify and cancel affordances.

## Prerequisites

- Staging environment with `/reservation/{id}`, `/reservation/{id}/cancel`, `/reservation/{id}/details`, and `/restaurant/{id}/slots` reachable.
- Test member account M1 with one upcoming confirmed reservation (RES-1) and one past reservation (RES-PAST).
- Test member account M2 with one previously cancelled reservation (RES-CXL).
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (detail screen shows full info + Modify/Cancel) | TC-003-003-001 (P0) | Yes |
| AC-002 (Modify pre-fills booking flow) | TC-003-003-001 (P0) | Yes |
| AC-003 (Submit modification → updated reservation) | TC-003-003-001 (P0) | Yes |
| AC-004 (Cancel with confirmation → list) | TC-003-003-001 (P0), TC-003-003-002 | Yes |
| AC-005 (Cancelled reservation hides Modify/Cancel) | TC-003-003-003 | Yes |
| AC-006 (Special requests update independently) | TC-003-003-001 (P0), TC-003-003-004 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-003-001: Member views detail, modifies time, updates notes, then cancels reservation

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-006
**Dependencies:** S-003-001 (browse reservations) must be Done so the detail entry point exists.

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-reservations | default |
| detail | DS-r

## Expected Result
# Test Plan: Modify Reservation

**ID:** T-003-003
**Project:** ch-mobile
**Story:** S-003-003
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that a member can view full reservation detail, modify date/time/party-size via the booking flow, update special requests independently, and cancel a reservation through an explicit confirmation dialog. Confirms that cancelled and past reservations correctly hide the modify and cancel affordances.

## Prerequisites

- Staging environment with `/reservation/{id}`, `/reservation/{id}/cancel`, `/reservation/{id}/details`, and `/restaurant/{id}/slots` reachable.
- Test member account M1 with one upcoming confirmed reservation (RES-1) and one past reservation (RES-PAST).
- Test member account M2 with one previously cancelled reservation (RES-CXL).
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (detail screen shows full info + Modify/Cancel) | TC-003-003-001 (P0) | Yes |
| AC-002 (Modify pre-fills booking flow) | TC-003-003-001 (P0) | Yes |
| AC-003 (Submit modification → updated reservation) | TC-003-003-001 (P0) | Yes |
| AC-004 (Cancel with confirmation → list) | TC-003-003-001 (P0), TC-003-003-002 | Yes |
| AC-005 (Cancelled reservation hides Modify/Cancel) | TC-003-003-003 | Yes |
| AC-006 (Special requests update independently) | TC-003-003-001 (P0), TC-003-003-004 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-003-001: Member views detail, modifies time, updates notes, then cancels reservation

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-006
**Dependencies:** S-003-001 (browse reservations) must be Done so the detail entry point exists.

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-reservations | default |
| detail | DS-r

