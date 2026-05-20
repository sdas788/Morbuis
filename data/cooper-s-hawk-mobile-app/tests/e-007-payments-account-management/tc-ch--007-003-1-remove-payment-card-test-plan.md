---
id: TC-CH--007-003-1
title: Remove Payment Card — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-007-003
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-003-remove-payment-card.md
  source_checksum: 6b946b54c142ee0b
---
## Steps
# Test Plan: Remove Payment Card

**ID:** T-007-003
**Project:** ch-mobile
**Story:** S-007-003
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies a potential member can remove a saved card via a confirmation popup that prevents accidental removal, that successful deletion (`DELETE /customer/payment/{id}`) clears the card and surfaces the empty "Add a Payment Method" state, that cancellation dismisses the popup with no side effect, that API errors keep the card in place with a clear error message, and that full members never see the remove affordance.

## Prerequisites

- Test potential member account with at least one saved card on file
- Test full member account with a saved card on file (for the negative-affordance check)
- Stagable `DELETE /customer/payment/{id}` endpoint (toggleable to error for the failure test)
- App authenticated for each role under test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (popup with copy + Remove + Cancel) | TC-007-003-001 (P0) | ✓ |
| AC-002 (confirm → delete success → empty state) | TC-007-003-001 (P0) | ✓ |
| AC-003 (cancel → popup dismissed, no delete) | TC-007-003-001 (P0), TC-007-003-002 | ✓ |
| AC-004 (delete API error → message, card remains) | TC-007-003-001 (P0), TC-007-003-003 | ✓ |
| AC-005 (full member: no remove option) | TC-007-003-001 (P0), TC-007-003-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-003-001: Potential member confirms removal, hits an API error, recovers, and a full member confirms no Remove option appears

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** S-007-001 must be Done (Payment Methods screen)

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-payment-methods | potential-member-card-on-file |
|

## Expected Result
# Test Plan: Remove Payment Card

**ID:** T-007-003
**Project:** ch-mobile
**Story:** S-007-003
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies a potential member can remove a saved card via a confirmation popup that prevents accidental removal, that successful deletion (`DELETE /customer/payment/{id}`) clears the card and surfaces the empty "Add a Payment Method" state, that cancellation dismisses the popup with no side effect, that API errors keep the card in place with a clear error message, and that full members never see the remove affordance.

## Prerequisites

- Test potential member account with at least one saved card on file
- Test full member account with a saved card on file (for the negative-affordance check)
- Stagable `DELETE /customer/payment/{id}` endpoint (toggleable to error for the failure test)
- App authenticated for each role under test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (popup with copy + Remove + Cancel) | TC-007-003-001 (P0) | ✓ |
| AC-002 (confirm → delete success → empty state) | TC-007-003-001 (P0) | ✓ |
| AC-003 (cancel → popup dismissed, no delete) | TC-007-003-001 (P0), TC-007-003-002 | ✓ |
| AC-004 (delete API error → message, card remains) | TC-007-003-001 (P0), TC-007-003-003 | ✓ |
| AC-005 (full member: no remove option) | TC-007-003-001 (P0), TC-007-003-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-003-001: Potential member confirms removal, hits an API error, recovers, and a full member confirms no Remove option appears

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** S-007-001 must be Done (Payment Methods screen)

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-payment-methods | potential-member-card-on-file |
|

