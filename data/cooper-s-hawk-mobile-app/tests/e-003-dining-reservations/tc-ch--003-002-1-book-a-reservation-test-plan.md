---
id: TC-CH--003-002-1
title: Book a Reservation — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-003-002
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-002-book-reservation.md
  source_checksum: cdc63b87da4ad786
---
## Steps
# Test Plan: Book a Reservation

**ID:** T-003-002
**Project:** ch-mobile
**Story:** S-003-002
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the end-to-end reservation booking flow for an authenticated member: dashboard entry, location/date/party-size/seating selection, slot fetch, confirmation submission, success and conflict handling, optional special requests, share and add-to-calendar affordances, and explicit error pathways for oversized parties and closed locations.

## Prerequisites

- Staging environment with `/restaurant/{id}/slots`, `/reservation`, and `/reservation/{id}/details` reachable.
- Test member account M1 with a preferred location set.
- Test member account M2 with no preferred location set.
- A test location (LOC-A) with at least three available slots on test date D for party size 2, dining seating type.
- A test location (LOC-B) configured with no availability on test date D (to drive the "no availability" path).
- A test location (LOC-C) configured to reject any party size above 12 (to drive the "reservation size too large" path).
- A guest (unauthenticated) test session.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (preferred location pre-selected or picker opens) | TC-003-002-001 (P0), TC-003-002-002 | Yes |
| AC-002 (available slots displayed as buttons) | TC-003-002-001 (P0) | Yes |
| AC-003 (no slots → "No availability" with retry prompt) | TC-003-002-003 | Yes |
| AC-004 (POST `/reservation` 201 → confirmation with reservation ID) | TC-003-002-001 (P0) | Yes |
| AC-005 (409 conflict → error + return to slot selection) | TC-003-002-004 | Yes |
| AC-006 (special requests saved via PUT `/reservation/{id}/details`) | TC-003-002-001 (P0), TC-003-002-005 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-002-001: Member books a res

## Expected Result
# Test Plan: Book a Reservation

**ID:** T-003-002
**Project:** ch-mobile
**Story:** S-003-002
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the end-to-end reservation booking flow for an authenticated member: dashboard entry, location/date/party-size/seating selection, slot fetch, confirmation submission, success and conflict handling, optional special requests, share and add-to-calendar affordances, and explicit error pathways for oversized parties and closed locations.

## Prerequisites

- Staging environment with `/restaurant/{id}/slots`, `/reservation`, and `/reservation/{id}/details` reachable.
- Test member account M1 with a preferred location set.
- Test member account M2 with no preferred location set.
- A test location (LOC-A) with at least three available slots on test date D for party size 2, dining seating type.
- A test location (LOC-B) configured with no availability on test date D (to drive the "no availability" path).
- A test location (LOC-C) configured to reject any party size above 12 (to drive the "reservation size too large" path).
- A guest (unauthenticated) test session.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (preferred location pre-selected or picker opens) | TC-003-002-001 (P0), TC-003-002-002 | Yes |
| AC-002 (available slots displayed as buttons) | TC-003-002-001 (P0) | Yes |
| AC-003 (no slots → "No availability" with retry prompt) | TC-003-002-003 | Yes |
| AC-004 (POST `/reservation` 201 → confirmation with reservation ID) | TC-003-002-001 (P0) | Yes |
| AC-005 (409 conflict → error + return to slot selection) | TC-003-002-004 | Yes |
| AC-006 (special requests saved via PUT `/reservation/{id}/details`) | TC-003-002-001 (P0), TC-003-002-005 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-002-001: Member books a res

