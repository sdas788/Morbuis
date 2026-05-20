---
id: TC-CH--007-001-1
title: View Payment Methods — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-007-001
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-001-view-payment-methods.md
  source_checksum: 0ec708e00aa6fbd3
---
## Steps
# Test Plan: View Payment Methods

**ID:** T-007-001
**Project:** ch-mobile
**Story:** S-007-001
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Payment Methods screen correctly fetches and displays the saved card on file for both members and potential members, shows the appropriate action affordances ("Edit Card" vs "Remove"), surfaces the "This card is used for online orders" alert, handles the empty state for potential members with no card, and gracefully degrades to an error-with-retry state when the payment API fails.

## Prerequisites

- Test member account provisioned with a saved BluePay card on file (last 4 = 1234, exp 12/27)
- Test potential member account provisioned with a saved card on file
- Test potential member account provisioned with **no** card on file
- Mocked / stagable `GET /customer/payment` endpoint that can be forced to return 5xx for the error retry test
- App built against staging API; user is authenticated before the test starts

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (member: card masked + Edit Card button) | TC-007-001-001 (P0) | ✓ |
| AC-002 (potential member: Remove link) | TC-007-001-001 (P0), TC-007-001-002 | ✓ |
| AC-003 (potential member, no card: Add a payment method button) | TC-007-001-001 (P0), TC-007-001-003 | ✓ |
| AC-004 ("This card is used for online orders" alert) | TC-007-001-001 (P0) | ✓ |
| AC-005 (API error → error message with retry) | TC-007-001-001 (P0), TC-007-001-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-001-001: Member and Potential Member view their card on file with role-correct affordances and recover from API error

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|-----

## Expected Result
# Test Plan: View Payment Methods

**ID:** T-007-001
**Project:** ch-mobile
**Story:** S-007-001
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Payment Methods screen correctly fetches and displays the saved card on file for both members and potential members, shows the appropriate action affordances ("Edit Card" vs "Remove"), surfaces the "This card is used for online orders" alert, handles the empty state for potential members with no card, and gracefully degrades to an error-with-retry state when the payment API fails.

## Prerequisites

- Test member account provisioned with a saved BluePay card on file (last 4 = 1234, exp 12/27)
- Test potential member account provisioned with a saved card on file
- Test potential member account provisioned with **no** card on file
- Mocked / stagable `GET /customer/payment` endpoint that can be forced to return 5xx for the error retry test
- App built against staging API; user is authenticated before the test starts

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (member: card masked + Edit Card button) | TC-007-001-001 (P0) | ✓ |
| AC-002 (potential member: Remove link) | TC-007-001-001 (P0), TC-007-001-002 | ✓ |
| AC-003 (potential member, no card: Add a payment method button) | TC-007-001-001 (P0), TC-007-001-003 | ✓ |
| AC-004 ("This card is used for online orders" alert) | TC-007-001-001 (P0) | ✓ |
| AC-005 (API error → error message with retry) | TC-007-001-001 (P0), TC-007-001-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-001-001: Member and Potential Member view their card on file with role-correct affordances and recover from API error

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|-----

