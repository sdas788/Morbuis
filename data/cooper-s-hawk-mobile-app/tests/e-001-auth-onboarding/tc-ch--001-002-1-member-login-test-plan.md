---
id: TC-CH--001-002-1
title: Member Login — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-002
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-002-member-login.md
  source_checksum: ce639bd8aec7a160
---
## Steps
# Test Plan: Member Login

**ID:** T-001-002
**Project:** ch-mobile
**Story:** S-001-002
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verify that a member can authenticate with email + password from the Login screen, that tokens are stored in iOS Keychain on success, that the dashboard loads with their default Wine Club membership, and that all error states (invalid credentials, backend error, network error) and the in-flight loading state behave per spec. The "Forgot Password?" and "Create Account" links must navigate to the correct flows.

## Prerequisites

- Test member account `qa-default@chwinery.test` exists in Cognito + Salesforce with a verified email and at least one Default Wine Club membership
- Test member account `qa-multi@chwinery.test` exists with two Wine Club memberships, one flagged Default
- Network access to the staging API; ability to mock backend responses (for 5xx) and toggle airplane mode (for offline)
- App freshly installed (no tokens in Keychain) so the Initial screen is the entry point
- Locations / preferred-locations endpoints are warm so post-login GETs succeed

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Valid creds → JWT + dashboard) | TC-001-002-001 (P0) | ✓ |
| AC-002 (Invalid creds → inline error, password cleared) | TC-001-002-001 (P0), TC-001-002-002 | ✓ |
| AC-003 (Backend non-auth error → patience message) | TC-001-002-001 (P0), TC-001-002-003 | ✓ |
| AC-004 (No network → connectivity message) | TC-001-002-004 | ✓ |
| AC-005 (Sign In disabled while in-flight) | TC-001-002-001 (P0), TC-001-002-005 | ✓ |
| AC-006 (Tokens stored in iOS Keychain) | TC-001-002-001 (P0) | ✓ |
| AC-007 (Multiple memberships → default loads) | TC-001-002-001 (P0), TC-001-002-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-002-001: Member wit

## Expected Result
# Test Plan: Member Login

**ID:** T-001-002
**Project:** ch-mobile
**Story:** S-001-002
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verify that a member can authenticate with email + password from the Login screen, that tokens are stored in iOS Keychain on success, that the dashboard loads with their default Wine Club membership, and that all error states (invalid credentials, backend error, network error) and the in-flight loading state behave per spec. The "Forgot Password?" and "Create Account" links must navigate to the correct flows.

## Prerequisites

- Test member account `qa-default@chwinery.test` exists in Cognito + Salesforce with a verified email and at least one Default Wine Club membership
- Test member account `qa-multi@chwinery.test` exists with two Wine Club memberships, one flagged Default
- Network access to the staging API; ability to mock backend responses (for 5xx) and toggle airplane mode (for offline)
- App freshly installed (no tokens in Keychain) so the Initial screen is the entry point
- Locations / preferred-locations endpoints are warm so post-login GETs succeed

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Valid creds → JWT + dashboard) | TC-001-002-001 (P0) | ✓ |
| AC-002 (Invalid creds → inline error, password cleared) | TC-001-002-001 (P0), TC-001-002-002 | ✓ |
| AC-003 (Backend non-auth error → patience message) | TC-001-002-001 (P0), TC-001-002-003 | ✓ |
| AC-004 (No network → connectivity message) | TC-001-002-004 | ✓ |
| AC-005 (Sign In disabled while in-flight) | TC-001-002-001 (P0), TC-001-002-005 | ✓ |
| AC-006 (Tokens stored in iOS Keychain) | TC-001-002-001 (P0) | ✓ |
| AC-007 (Multiple memberships → default loads) | TC-001-002-001 (P0), TC-001-002-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-001-002-001: Member wit

