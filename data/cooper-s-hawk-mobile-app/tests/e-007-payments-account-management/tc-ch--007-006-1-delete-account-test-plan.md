---
id: TC-CH--007-006-1
title: Delete Account — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-007-006
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-006
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-006-delete-account.md
  source_checksum: ee11b680814347a3
---
## Steps
# Test Plan: Delete Account

**ID:** T-007-006
**Project:** ch-mobile
**Story:** S-007-006
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the multi-step account deletion flow: a "Delete Account" entry point in Settings, a confirmation modal that warns about permanence and lists consequences, a successful `DELETE /customer` call followed by `DELETE /session`, full local-state purge (tokens, cache, Keychain), redirect to the unauthenticated landing screen, cancellation that performs no destructive action, and graceful error handling on API failure.

> ⚠️ **Sensitive flow** — these test cases must run only against disposable test accounts, never real production members. Tests may not include real card numbers; if cards are seeded for the deletion check, use BluePay test PANs (e.g., `4111 1111 1111 1111`).

## Prerequisites

- Disposable test member account, freshly seeded for each run; never re-use a production account
- App authenticated to that account
- Stagable `DELETE /customer` and `DELETE /session` endpoints (toggleable to error)
- Local storage / Keychain inspection capability (e.g., simulator file inspector or platform-specific test helper)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (modal warns + lists consequences + Delete/Cancel buttons) | TC-007-006-001 (P0) | ✓ |
| AC-002 (confirm → DELETE customer → DELETE session → local cleared → unauth landing) | TC-007-006-001 (P0) | ✓ |
| AC-003 (cancel → modal dismissed, no deletion) | TC-007-006-001 (P0), TC-007-006-002 | ✓ |
| AC-004 (API error → message + remain logged in) | TC-007-006-001 (P0), TC-007-006-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-006-001: Member sees confirmation, cancels safely, hits an API error, recovers, then permanently deletes the account and lands unauthenticated 

## Expected Result
# Test Plan: Delete Account

**ID:** T-007-006
**Project:** ch-mobile
**Story:** S-007-006
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the multi-step account deletion flow: a "Delete Account" entry point in Settings, a confirmation modal that warns about permanence and lists consequences, a successful `DELETE /customer` call followed by `DELETE /session`, full local-state purge (tokens, cache, Keychain), redirect to the unauthenticated landing screen, cancellation that performs no destructive action, and graceful error handling on API failure.

> ⚠️ **Sensitive flow** — these test cases must run only against disposable test accounts, never real production members. Tests may not include real card numbers; if cards are seeded for the deletion check, use BluePay test PANs (e.g., `4111 1111 1111 1111`).

## Prerequisites

- Disposable test member account, freshly seeded for each run; never re-use a production account
- App authenticated to that account
- Stagable `DELETE /customer` and `DELETE /session` endpoints (toggleable to error)
- Local storage / Keychain inspection capability (e.g., simulator file inspector or platform-specific test helper)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (modal warns + lists consequences + Delete/Cancel buttons) | TC-007-006-001 (P0) | ✓ |
| AC-002 (confirm → DELETE customer → DELETE session → local cleared → unauth landing) | TC-007-006-001 (P0) | ✓ |
| AC-003 (cancel → modal dismissed, no deletion) | TC-007-006-001 (P0), TC-007-006-002 | ✓ |
| AC-004 (API error → message + remain logged in) | TC-007-006-001 (P0), TC-007-006-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-006-001: Member sees confirmation, cancels safely, hits an API error, recovers, then permanently deletes the account and lands unauthenticated 

