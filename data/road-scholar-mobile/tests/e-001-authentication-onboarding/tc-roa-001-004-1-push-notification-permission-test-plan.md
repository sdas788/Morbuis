---
id: TC-ROA-001-004-1
title: Push Notification Permission — Test Plan
category: e-001-authentication-onboarding
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-001-004
  - e-001
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-001-004
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-001-auth-onboarding/T-001-004-push-notification-permission.md
  source_checksum: 55cf11b73bd80d4e
---
## Steps
# Test Plan: Push Notification Permission

**ID:** T-001-004
**Story:** S-001-004
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the push notification permission prompt during onboarding: granting permission during onboarding results in push delivery for group events; skipping leaves the option available in Settings; the `hasSeenNotificationsModal` flag prevents the modal from being shown more than once; and granting permission results in the FCM token being stored in the Verint user profile.

## Prerequisites

- Test device with FCM push notification capability (physical device or FCM-compatible simulator)
- Verint staging API accessible
- Firebase staging project configured
- Test account in onboarding flow (post-Welcome, pre-Complete step)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (permission granted → push delivered on group event) | TC-001-004-001 (P0) | ✓ |
| AC-002 (permission skipped → Settings enable option available) | TC-001-004-002 | ✓ |
| AC-003 (`hasSeenNotificationsModal` set → modal not shown again) | TC-001-004-003 | ✓ |
| AC-004 (permission granted → FCM token stored in Verint) | TC-001-004-004 | ✓ |

---

## Core Test Flow

### TC-001-004-001: Permission granted during onboarding — push notification delivered on group event

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-004
**Dependencies:** TC-001-003-001

**Preconditions:**
- User is at the notification permission step in onboarding
- Device is FCM-capable
- Test group exists in staging with another user who can trigger a post

**Steps:**
1. On the notification permission screen, tap "Allow"
2. Accept the native OS permission dialog
3. Complete onboarding and reach the home screen
4. Have another test user post in a group the user belongs to
5. Observe the device for a push notification

**Expected Result:**
A push notification is delivered to th

## Expected Result
# Test Plan: Push Notification Permission

**ID:** T-001-004
**Story:** S-001-004
**Epic:** E-001
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the push notification permission prompt during onboarding: granting permission during onboarding results in push delivery for group events; skipping leaves the option available in Settings; the `hasSeenNotificationsModal` flag prevents the modal from being shown more than once; and granting permission results in the FCM token being stored in the Verint user profile.

## Prerequisites

- Test device with FCM push notification capability (physical device or FCM-compatible simulator)
- Verint staging API accessible
- Firebase staging project configured
- Test account in onboarding flow (post-Welcome, pre-Complete step)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (permission granted → push delivered on group event) | TC-001-004-001 (P0) | ✓ |
| AC-002 (permission skipped → Settings enable option available) | TC-001-004-002 | ✓ |
| AC-003 (`hasSeenNotificationsModal` set → modal not shown again) | TC-001-004-003 | ✓ |
| AC-004 (permission granted → FCM token stored in Verint) | TC-001-004-004 | ✓ |

---

## Core Test Flow

### TC-001-004-001: Permission granted during onboarding — push notification delivered on group event

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-004
**Dependencies:** TC-001-003-001

**Preconditions:**
- User is at the notification permission step in onboarding
- Device is FCM-capable
- Test group exists in staging with another user who can trigger a post

**Steps:**
1. On the notification permission screen, tap "Allow"
2. Accept the native OS permission dialog
3. Complete onboarding and reach the home screen
4. Have another test user post in a group the user belongs to
5. Observe the device for a push notification

**Expected Result:**
A push notification is delivered to th

