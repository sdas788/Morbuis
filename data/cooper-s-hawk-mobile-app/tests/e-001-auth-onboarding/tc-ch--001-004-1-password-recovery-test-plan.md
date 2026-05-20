---
id: TC-CH--001-004-1
title: Password Recovery — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-004
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-004
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-004-password-recovery.md
  source_checksum: 74fa1b0089b0344b
---
## Steps
# Test Plan: Password Recovery

**ID:** T-001-004
**Project:** ch-mobile
**Story:** S-001-004
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate the three-step password recovery flow: a "Forgot Password?" modal slide-up that requests a reset code via `POST /customer/forgot-password`; a 6-digit code entry step with auto-advance and resend that invalidates prior codes; and a set-new-password step that enforces the password rules and the matching confirmation, then logs the user in via `POST /customer/reset-password` and lands them on the Dashboard. Negative paths cover non-existent email and password mismatch.

## Prerequisites

- Test account `qa-recover@chwinery.test` exists, verified, with a known password (so post-flow login can be verified)
- A controllable inbox for receiving the 6-digit codes
- Staging environment with `POST /customer/forgot-password` and `POST /customer/reset-password` reachable
- App on the Login screen as the entry point

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Modal slides up + blurred background) | TC-001-004-001 (P0) | ✓ |
| AC-002 (Existing email → code sent + step 2 shown) | TC-001-004-001 (P0) | ✓ |
| AC-003 (Non-existent email → message) | TC-001-004-002 | ✓ |
| AC-004 (6th digit → advance to step 3) | TC-001-004-001 (P0) | ✓ |
| AC-005 (Resend invalidates previous code) | TC-001-004-001 (P0), TC-001-004-003 | ✓ |
| AC-006 (Valid new password → login + Dashboard) | TC-001-004-001 (P0) | ✓ |
| AC-007 (Mismatched passwords → "must match" error) | TC-001-004-001 (P0), TC-001-004-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-004-001: Member resets a forgotten password end-to-end — modal, code, resend invalidation, set new password, auto-login to Dashboard

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, A

## Expected Result
# Test Plan: Password Recovery

**ID:** T-001-004
**Project:** ch-mobile
**Story:** S-001-004
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate the three-step password recovery flow: a "Forgot Password?" modal slide-up that requests a reset code via `POST /customer/forgot-password`; a 6-digit code entry step with auto-advance and resend that invalidates prior codes; and a set-new-password step that enforces the password rules and the matching confirmation, then logs the user in via `POST /customer/reset-password` and lands them on the Dashboard. Negative paths cover non-existent email and password mismatch.

## Prerequisites

- Test account `qa-recover@chwinery.test` exists, verified, with a known password (so post-flow login can be verified)
- A controllable inbox for receiving the 6-digit codes
- Staging environment with `POST /customer/forgot-password` and `POST /customer/reset-password` reachable
- App on the Login screen as the entry point

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Modal slides up + blurred background) | TC-001-004-001 (P0) | ✓ |
| AC-002 (Existing email → code sent + step 2 shown) | TC-001-004-001 (P0) | ✓ |
| AC-003 (Non-existent email → message) | TC-001-004-002 | ✓ |
| AC-004 (6th digit → advance to step 3) | TC-001-004-001 (P0) | ✓ |
| AC-005 (Resend invalidates previous code) | TC-001-004-001 (P0), TC-001-004-003 | ✓ |
| AC-006 (Valid new password → login + Dashboard) | TC-001-004-001 (P0) | ✓ |
| AC-007 (Mismatched passwords → "must match" error) | TC-001-004-001 (P0), TC-001-004-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-004-001: Member resets a forgotten password end-to-end — modal, code, resend invalidation, set new password, auto-login to Dashboard

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, A

