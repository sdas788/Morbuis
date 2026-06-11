---
id: TC-ROA-001-003-1
title: Welcome Onboarding — Test Plan
category: e-001-authentication-onboarding
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-003
  - e-001
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-001-003
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-001-auth-onboarding/T-001-003-welcome-onboarding.md
  source_checksum: e0d1d41dc2d3b4d0
---
## Steps
# Test Plan: Welcome Onboarding

**ID:** T-001-003
**Story:** S-001-003
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the first-login onboarding flow: the welcome screen appears before home on first login, the `completedOnboarding` flag prevents the walkthrough from repeating on subsequent launches, skipping the walkthrough sets the flag and routes to home, and completing the Setup modal (photo + display name) updates the profile before proceeding.

## Prerequisites

- Test account with no prior `completedOnboarding` flag set (fresh user state)
- Second test account with `completedOnboarding` already set (returning user)
- Verint user profile API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (first login → welcome screen before home) | TC-001-003-001 (P0) | ✓ |
| AC-002 (onboarding completed → subsequent launch goes to home) | TC-001-003-002 | ✓ |
| AC-003 (skip → flag set → home screen) | TC-001-003-003 | ✓ |
| AC-004 (Setup modal → photo + name → profile updated) | TC-001-003-004 | ✓ |

---

## Core Test Flow

### TC-001-003-001: First login shows welcome screen before home screen

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-001-001-001

**Preconditions:**
- Fresh test account — `completedOnboarding` flag is not set
- User has completed Salesforce SSO login

**Steps:**
1. Complete Salesforce SSO login with the fresh test account
2. Observe the screen that appears after successful authentication

**Expected Result:**
The welcome/onboarding screen appears before the home screen. The home screen is not visible until the user completes or skips onboarding.

**Failure Indicators:**
Home screen loads immediately after login; onboarding screen is skipped entirely; app crashes during the transition.

---

## Sub Flows

### TC-001-003-002: Completed onboarding — subsequent app launch go

## Expected Result
# Test Plan: Welcome Onboarding

**ID:** T-001-003
**Story:** S-001-003
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the first-login onboarding flow: the welcome screen appears before home on first login, the `completedOnboarding` flag prevents the walkthrough from repeating on subsequent launches, skipping the walkthrough sets the flag and routes to home, and completing the Setup modal (photo + display name) updates the profile before proceeding.

## Prerequisites

- Test account with no prior `completedOnboarding` flag set (fresh user state)
- Second test account with `completedOnboarding` already set (returning user)
- Verint user profile API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (first login → welcome screen before home) | TC-001-003-001 (P0) | ✓ |
| AC-002 (onboarding completed → subsequent launch goes to home) | TC-001-003-002 | ✓ |
| AC-003 (skip → flag set → home screen) | TC-001-003-003 | ✓ |
| AC-004 (Setup modal → photo + name → profile updated) | TC-001-003-004 | ✓ |

---

## Core Test Flow

### TC-001-003-001: First login shows welcome screen before home screen

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-001-001-001

**Preconditions:**
- Fresh test account — `completedOnboarding` flag is not set
- User has completed Salesforce SSO login

**Steps:**
1. Complete Salesforce SSO login with the fresh test account
2. Observe the screen that appears after successful authentication

**Expected Result:**
The welcome/onboarding screen appears before the home screen. The home screen is not visible until the user completes or skips onboarding.

**Failure Indicators:**
Home screen loads immediately after login; onboarding screen is skipped entirely; app crashes during the transition.

---

## Sub Flows

### TC-001-003-002: Completed onboarding — subsequent app launch go

