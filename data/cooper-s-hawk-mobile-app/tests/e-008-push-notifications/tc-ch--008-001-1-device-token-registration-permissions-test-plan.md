---
id: TC-CH--008-001-1
title: Device Token Registration & Permissions — Test Plan
category: e-008-push-notifications
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-008-001
  - e-008
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-008-001
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-008-push-notifications/T-008-001-device-token-registration.md
  source_checksum: 1c11ea447adf8ec8
---
## Steps
# Test Plan: Device Token Registration & Permissions

**ID:** T-008-001
**Project:** ch-mobile
**Story:** S-008-001
**Epic:** E-008
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that on first sign-in the Cooper's Hawk mobile app surfaces the OS-level notification permission prompt, and on grant retrieves an FCM token and registers it with the back end via `PUT /customer/push-notification` with `{ deviceId, platform, token }`. On denial, no token is registered and no error is shown to the user. Covers both iOS (alert/badge/sound) and Android (`POST_NOTIFICATIONS`) prompt behaviour.

## Prerequisites

- Test member account provisioned in the QA environment with valid credentials
- Real device or simulator/emulator capable of receiving FCM/APNs tokens (push delivery requires real hardware on iOS; Android emulators with Google Play Services accept FCM)
- App installed fresh — no prior permission decision recorded by the OS for the bundle ID
- Charles Proxy or equivalent network capture available to verify `PUT /customer/push-notification` request body
- Firebase / APNs sandbox project configured in the build the tester is using
- Device has working network connectivity

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (OS permission prompt shown on first sign-in) | TC-008-001-001 (P0), TC-008-001-005, TC-008-001-006 | ✓ |
| AC-002 (token registered via PUT on grant) | TC-008-001-001 (P0), TC-008-001-007 | ✓ |
| AC-003 (denial → no token, no error) | TC-008-001-001 (P0), TC-008-001-002, TC-008-001-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-008-001-001: First sign-in shows OS prompt, grant registers device token with backend

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|-------

## Expected Result
# Test Plan: Device Token Registration & Permissions

**ID:** T-008-001
**Project:** ch-mobile
**Story:** S-008-001
**Epic:** E-008
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that on first sign-in the Cooper's Hawk mobile app surfaces the OS-level notification permission prompt, and on grant retrieves an FCM token and registers it with the back end via `PUT /customer/push-notification` with `{ deviceId, platform, token }`. On denial, no token is registered and no error is shown to the user. Covers both iOS (alert/badge/sound) and Android (`POST_NOTIFICATIONS`) prompt behaviour.

## Prerequisites

- Test member account provisioned in the QA environment with valid credentials
- Real device or simulator/emulator capable of receiving FCM/APNs tokens (push delivery requires real hardware on iOS; Android emulators with Google Play Services accept FCM)
- App installed fresh — no prior permission decision recorded by the OS for the bundle ID
- Charles Proxy or equivalent network capture available to verify `PUT /customer/push-notification` request body
- Firebase / APNs sandbox project configured in the build the tester is using
- Device has working network connectivity

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (OS permission prompt shown on first sign-in) | TC-008-001-001 (P0), TC-008-001-005, TC-008-001-006 | ✓ |
| AC-002 (token registered via PUT on grant) | TC-008-001-001 (P0), TC-008-001-007 | ✓ |
| AC-003 (denial → no token, no error) | TC-008-001-001 (P0), TC-008-001-002, TC-008-001-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-008-001-001: First sign-in shows OS prompt, grant registers device token with backend

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|-------

