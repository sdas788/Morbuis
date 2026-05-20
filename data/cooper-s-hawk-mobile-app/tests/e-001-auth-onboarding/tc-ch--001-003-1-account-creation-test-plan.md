---
id: TC-CH--001-003-1
title: Account Creation — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-003
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-003-account-creation.md
  source_checksum: f3112e1fe430135d
---
## Steps
# Test Plan: Account Creation

**ID:** T-001-003
**Project:** ch-mobile
**Story:** S-001-003
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that a guest can complete the multi-step signup: enter all required profile fields with correct inline validation, accept Terms (required) while seeing marketing opt-in defaulted on, submit the form to `POST /customer`, receive and enter a 6-digit email verification code that auto-advances, resend the code (invalidating the previous), and land on the dashboard via auto-login. Negative paths cover field-level validation messages, duplicate-email modal, and the Terms-not-checked submission guard.

## Prerequisites

- Staging Cognito + Salesforce wired so `POST /customer` provisions in Salesforce first then Cognito
- A mailbox under the team's control (or an inbox-as-a-service like Mailosaur) where the verification email lands
- A pre-existing account `qa-existing@chwinery.test` to test the duplicate email path
- App freshly installed; user starts on the Initial screen
- Privacy Policy and Terms of Use URLs are reachable from the in-app browser

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Valid form → POST /customer → verify screen) | TC-001-003-001 (P0) | ✓ |
| AC-002 (6th digit correct → activate + auto-login) | TC-001-003-001 (P0) | ✓ |
| AC-003 (Password rule violation → inline error) | TC-001-003-001 (P0), TC-001-003-002 | ✓ |
| AC-004 (Duplicate email → modal) | TC-001-003-003 | ✓ |
| AC-005 (Email missing @ → message) | TC-001-003-001 (P0), TC-001-003-004 | ✓ |
| AC-006 (Phone < 10 digits → message) | TC-001-003-001 (P0), TC-001-003-005 | ✓ |
| AC-007 (Terms unchecked → block submit + message) | TC-001-003-001 (P0), TC-001-003-006 | ✓ |
| AC-008 (Marketing opt-in defaults checked) | TC-001-003-001 (P0) | ✓ |
| AC-009 (Resend invalidates previous code) | TC-001-003-001 (P0), TC-001-003-007 | ✓ |

---

## 

## Expected Result
# Test Plan: Account Creation

**ID:** T-001-003
**Project:** ch-mobile
**Story:** S-001-003
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that a guest can complete the multi-step signup: enter all required profile fields with correct inline validation, accept Terms (required) while seeing marketing opt-in defaulted on, submit the form to `POST /customer`, receive and enter a 6-digit email verification code that auto-advances, resend the code (invalidating the previous), and land on the dashboard via auto-login. Negative paths cover field-level validation messages, duplicate-email modal, and the Terms-not-checked submission guard.

## Prerequisites

- Staging Cognito + Salesforce wired so `POST /customer` provisions in Salesforce first then Cognito
- A mailbox under the team's control (or an inbox-as-a-service like Mailosaur) where the verification email lands
- A pre-existing account `qa-existing@chwinery.test` to test the duplicate email path
- App freshly installed; user starts on the Initial screen
- Privacy Policy and Terms of Use URLs are reachable from the in-app browser

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Valid form → POST /customer → verify screen) | TC-001-003-001 (P0) | ✓ |
| AC-002 (6th digit correct → activate + auto-login) | TC-001-003-001 (P0) | ✓ |
| AC-003 (Password rule violation → inline error) | TC-001-003-001 (P0), TC-001-003-002 | ✓ |
| AC-004 (Duplicate email → modal) | TC-001-003-003 | ✓ |
| AC-005 (Email missing @ → message) | TC-001-003-001 (P0), TC-001-003-004 | ✓ |
| AC-006 (Phone < 10 digits → message) | TC-001-003-001 (P0), TC-001-003-005 | ✓ |
| AC-007 (Terms unchecked → block submit + message) | TC-001-003-001 (P0), TC-001-003-006 | ✓ |
| AC-008 (Marketing opt-in defaults checked) | TC-001-003-001 (P0) | ✓ |
| AC-009 (Resend invalidates previous code) | TC-001-003-001 (P0), TC-001-003-007 | ✓ |

---

## 

