---
id: TC-ROA-001-002-1
title: Biometric Authentication — Test Plan
category: e-001-authentication-onboarding
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-002
  - e-001
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-001-002
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-001-auth-onboarding/T-001-002-biometric-auth.md
  source_checksum: 03e4300955f28f5e
---
## Steps
# Test Plan: Biometric Authentication

**ID:** T-001-002
**Story:** S-001-002
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the biometric authentication opt-in and runtime behavior: the post-login prompt appears only on biometric-capable devices, successful biometric unlock bypasses SSO, failed/cancelled biometric falls back to SSO, and the Settings toggle correctly enables or disables the feature.

## Prerequisites

- Device with Face ID or Touch ID support available for happy path tests
- Device without biometric support (or simulator with biometrics disabled) for the exclusion test
- User account authenticated via Salesforce SSO (S-001-001 complete)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (biometrics enabled + relaunch → home without SSO) | TC-001-002-001 (P0) | ✓ |
| AC-002 (biometric fails/cancelled → SSO login screen) | TC-001-002-002 | ✓ |
| AC-003 (no biometric support → no opt-in prompt) | TC-001-002-003 | ✓ |
| AC-004 (disable in Settings → subsequent launch uses SSO) | TC-001-002-004 | ✓ |

---

## Core Test Flow

### TC-001-002-001: Biometrics enabled — app relaunch bypasses SSO and reaches home screen

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-001-001-001

**Preconditions:**
- Device supports Face ID or Touch ID
- User previously logged in via SSO and accepted the biometric opt-in prompt
- Biometrics enabled in app settings

**Steps:**
1. Background and fully close the app
2. Relaunch the app
3. Observe the biometric prompt appears
4. Authenticate using Face ID or Touch ID

**Expected Result:**
User reaches the home screen without being redirected to the Salesforce OAuth web view. SSO flow is not triggered.

**Failure Indicators:**
Salesforce OAuth web view opens instead; biometric prompt does not appear; home screen does not load after successful biometric.

---

## Sub Flows

##

## Expected Result
# Test Plan: Biometric Authentication

**ID:** T-001-002
**Story:** S-001-002
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the biometric authentication opt-in and runtime behavior: the post-login prompt appears only on biometric-capable devices, successful biometric unlock bypasses SSO, failed/cancelled biometric falls back to SSO, and the Settings toggle correctly enables or disables the feature.

## Prerequisites

- Device with Face ID or Touch ID support available for happy path tests
- Device without biometric support (or simulator with biometrics disabled) for the exclusion test
- User account authenticated via Salesforce SSO (S-001-001 complete)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (biometrics enabled + relaunch → home without SSO) | TC-001-002-001 (P0) | ✓ |
| AC-002 (biometric fails/cancelled → SSO login screen) | TC-001-002-002 | ✓ |
| AC-003 (no biometric support → no opt-in prompt) | TC-001-002-003 | ✓ |
| AC-004 (disable in Settings → subsequent launch uses SSO) | TC-001-002-004 | ✓ |

---

## Core Test Flow

### TC-001-002-001: Biometrics enabled — app relaunch bypasses SSO and reaches home screen

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-001-001-001

**Preconditions:**
- Device supports Face ID or Touch ID
- User previously logged in via SSO and accepted the biometric opt-in prompt
- Biometrics enabled in app settings

**Steps:**
1. Background and fully close the app
2. Relaunch the app
3. Observe the biometric prompt appears
4. Authenticate using Face ID or Touch ID

**Expected Result:**
User reaches the home screen without being redirected to the Salesforce OAuth web view. SSO flow is not triggered.

**Failure Indicators:**
Salesforce OAuth web view opens instead; biometric prompt does not appear; home screen does not load after successful biometric.

---

## Sub Flows

##

