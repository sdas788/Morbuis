---
id: TC-CH--003-006-1
title: Pay Check — Test Plan
category: e-003-dining-reservations
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-003-006
  - e-003
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-003-006
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-003-dining-reservations/T-003-006-pay-check.md
  source_checksum: deaae79b034e7e24
---
## Steps
# Test Plan: Pay Check

**ID:** T-003-006
**Project:** ch-mobile
**Story:** S-003-006
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can review an itemized check, choose a tip (preset or custom) calculated on pre-tax subtotal, see a dynamically-updating grand total, select a card on file, and pay through a card-on-file submission. Confirms success and decline handling, the no-card-on-file guidance, and the in-flight pay-button disable behaviour.

## Prerequisites

- Staging environment with `/order/ticket/{id}` and `/order/{id}/close/cof` reachable.
- Member account M1 with at least one card on file (last 4 = 4242, brand = Visa).
- Member account M2 with no cards on file.
- An open ticket TKT-1 with multiple items, a known subtotal of $80.00, tax of $6.40, and total of $86.40 pre-tip.
- An open ticket TKT-DECLINE which is configured so that POST `/order/{id}/close/cof` returns 402.
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (items, subtotal, tax, total displayed) | TC-003-006-001 (P0) | Yes |
| AC-002 (preset tip selection updates total in real time) | TC-003-006-001 (P0) | Yes |
| AC-003 (custom tip input recalculates total) | TC-003-006-001 (P0), TC-003-006-002 | Yes |
| AC-004 (Pay success → confirmation with total + tip) | TC-003-006-001 (P0) | Yes |
| AC-005 (Payment declined → error message + retry option) | TC-003-006-003 | Yes |
| AC-006 (No card → directs to add one in account settings) | TC-003-006-004 | Yes |
| AC-007 (Pay button disabled with loader while in flight) | TC-003-006-001 (P0), TC-003-006-005 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-006-001: Member reviews check, applies preset and custom tip, pays with card on file

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-

## Expected Result
# Test Plan: Pay Check

**ID:** T-003-006
**Project:** ch-mobile
**Story:** S-003-006
**Epic:** E-003
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that an authenticated member can review an itemized check, choose a tip (preset or custom) calculated on pre-tax subtotal, see a dynamically-updating grand total, select a card on file, and pay through a card-on-file submission. Confirms success and decline handling, the no-card-on-file guidance, and the in-flight pay-button disable behaviour.

## Prerequisites

- Staging environment with `/order/ticket/{id}` and `/order/{id}/close/cof` reachable.
- Member account M1 with at least one card on file (last 4 = 4242, brand = Visa).
- Member account M2 with no cards on file.
- An open ticket TKT-1 with multiple items, a known subtotal of $80.00, tax of $6.40, and total of $86.40 pre-tip.
- An open ticket TKT-DECLINE which is configured so that POST `/order/{id}/close/cof` returns 402.
- Network online.

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (items, subtotal, tax, total displayed) | TC-003-006-001 (P0) | Yes |
| AC-002 (preset tip selection updates total in real time) | TC-003-006-001 (P0) | Yes |
| AC-003 (custom tip input recalculates total) | TC-003-006-001 (P0), TC-003-006-002 | Yes |
| AC-004 (Pay success → confirmation with total + tip) | TC-003-006-001 (P0) | Yes |
| AC-005 (Payment declined → error message + retry option) | TC-003-006-003 | Yes |
| AC-006 (No card → directs to add one in account settings) | TC-003-006-004 | Yes |
| AC-007 (Pay button disabled with loader while in flight) | TC-003-006-001 (P0), TC-003-006-005 | Yes |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-003-006-001: Member reviews check, applies preset and custom tip, pays with card on file

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-

