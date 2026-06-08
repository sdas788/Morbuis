---
id: TC-ROA-001-001-1
title: Salesforce SSO Login — Test Plan
category: e-001-authentication-onboarding
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-001
  - e-001
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-001-001
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-001-auth-onboarding/T-001-001-salesforce-sso-login.md
  source_checksum: 1572970ea59a89ee
---
## Steps
# Test Plan: Salesforce SSO Login

**ID:** T-001-001
**Story:** S-001-001
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies that authenticated login via Salesforce OAuth works end-to-end: the user reaches the home screen with groups loaded after a successful login, tokens are stored securely, silent token refresh handles 401 responses, and error states (invalid credentials, network failure) are surfaced correctly to the user.

## Prerequisites

- Staging Salesforce OAuth environment configured with test user credentials
- Test device connected to network
- Keychain available on test device (no locked state)
- Verint staging API accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (valid login → home screen) | TC-001-001-001 (P0) | ✓ |
| AC-002 (expired token → silent refresh + retry) | TC-001-001-002 | ✓ |
| AC-003 (invalid credentials → inline error) | TC-001-001-003 | ✓ |
| AC-004 (network failure → error modal + retry) | TC-001-001-004 | ✓ |

---

## Core Test Flow

### TC-001-001-001: Successful SSO login — user reaches home screen with groups loaded

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

**Preconditions:**
- App freshly installed or logged out
- Valid Road Scholar / Salesforce test account credentials available
- Network connectivity active

**Steps:**
1. Launch the app
2. Observe the login screen with Salesforce OAuth entry point
3. Tap the login / "Sign In" button to open the Salesforce OAuth web view
4. Enter valid Salesforce credentials and submit
5. Observe OAuth flow completes and returns to the app

**Expected Result:**
User is redirected to the home screen. Their trip groups are loaded and visible. Access token, refresh token, and ID token are stored in the device keychain. No error messages are displayed.

**Failure Indicators:**
Login screen remains visible; error message appea

## Expected Result
# Test Plan: Salesforce SSO Login

**ID:** T-001-001
**Story:** S-001-001
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies that authenticated login via Salesforce OAuth works end-to-end: the user reaches the home screen with groups loaded after a successful login, tokens are stored securely, silent token refresh handles 401 responses, and error states (invalid credentials, network failure) are surfaced correctly to the user.

## Prerequisites

- Staging Salesforce OAuth environment configured with test user credentials
- Test device connected to network
- Keychain available on test device (no locked state)
- Verint staging API accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (valid login → home screen) | TC-001-001-001 (P0) | ✓ |
| AC-002 (expired token → silent refresh + retry) | TC-001-001-002 | ✓ |
| AC-003 (invalid credentials → inline error) | TC-001-001-003 | ✓ |
| AC-004 (network failure → error modal + retry) | TC-001-001-004 | ✓ |

---

## Core Test Flow

### TC-001-001-001: Successful SSO login — user reaches home screen with groups loaded

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

**Preconditions:**
- App freshly installed or logged out
- Valid Road Scholar / Salesforce test account credentials available
- Network connectivity active

**Steps:**
1. Launch the app
2. Observe the login screen with Salesforce OAuth entry point
3. Tap the login / "Sign In" button to open the Salesforce OAuth web view
4. Enter valid Salesforce credentials and submit
5. Observe OAuth flow completes and returns to the app

**Expected Result:**
User is redirected to the home screen. Their trip groups are loaded and visible. Access token, refresh token, and ID token are stored in the device keychain. No error messages are displayed.

**Failure Indicators:**
Login screen remains visible; error message appea

