---
id: TC-CH--007-002-1
title: Add Payment Card — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-007-002
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-002-add-payment-card.md
  source_checksum: 9dbd26bc7fcbd04e
---
## Steps
# Test Plan: Add Payment Card

**ID:** T-007-002
**Project:** ch-mobile
**Story:** S-007-002
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies a member can add a new payment card through the BluePay tokenization flow: load the BluePay form via `GET /customer/payment/bluepay`, submit a valid card and ZIP, succeed via `POST /customer/payment`, return to the Payment Methods screen with the new card listed, and recover gracefully from validation errors and tokenization failures. Card data must never be logged in raw form.

## Prerequisites

- Test member account authenticated and in good standing
- Staging BluePay endpoint configured with test card numbers (e.g., `4111 1111 1111 1111` for Visa, `4000 0000 0000 0002` for forced-decline)
- Network proxy / log capture available to inspect outgoing requests for raw PAN leakage
- App built against staging API

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (form fields shown + client-side validation) | TC-007-002-001 (P0), TC-007-002-002 | ✓ |
| AC-002 (valid submit → tokenize → save → return → list updated) | TC-007-002-001 (P0) | ✓ |
| AC-003 (invalid card number → field validation, submit blocked) | TC-007-002-001 (P0), TC-007-002-003 | ✓ |
| AC-004 (BluePay tokenization failure → specific error → retry) | TC-007-002-001 (P0), TC-007-002-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-002-001: Member adds a valid card, hits validation on a bad card, recovers from a decline, and lands on Payment Methods with the card saved

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004
**Dependencies:** S-007-001 must be Done (Payment Methods screen needed as start/landing screen)

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-payment-methods | empty |
| form-def

## Expected Result
# Test Plan: Add Payment Card

**ID:** T-007-002
**Project:** ch-mobile
**Story:** S-007-002
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies a member can add a new payment card through the BluePay tokenization flow: load the BluePay form via `GET /customer/payment/bluepay`, submit a valid card and ZIP, succeed via `POST /customer/payment`, return to the Payment Methods screen with the new card listed, and recover gracefully from validation errors and tokenization failures. Card data must never be logged in raw form.

## Prerequisites

- Test member account authenticated and in good standing
- Staging BluePay endpoint configured with test card numbers (e.g., `4111 1111 1111 1111` for Visa, `4000 0000 0000 0002` for forced-decline)
- Network proxy / log capture available to inspect outgoing requests for raw PAN leakage
- App built against staging API

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (form fields shown + client-side validation) | TC-007-002-001 (P0), TC-007-002-002 | ✓ |
| AC-002 (valid submit → tokenize → save → return → list updated) | TC-007-002-001 (P0) | ✓ |
| AC-003 (invalid card number → field validation, submit blocked) | TC-007-002-001 (P0), TC-007-002-003 | ✓ |
| AC-004 (BluePay tokenization failure → specific error → retry) | TC-007-002-001 (P0), TC-007-002-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-002-001: Member adds a valid card, hits validation on a bad card, recovers from a decline, and lands on Payment Methods with the card saved

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004
**Dependencies:** S-007-001 must be Done (Payment Methods screen needed as start/landing screen)

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-payment-methods | empty |
| form-def

