---
id: TC-ROA-005-001-1
title: Push Notification Delivery — Test Plan
category: e-005-notifications-preferences
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-005-001
  - e-005
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-005-001
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-005-notifications-preferences/T-005-001-push-notification-delivery.md
  source_checksum: c9cc3504ea40009f
---
## Steps
# Test Plan: Push Notification Delivery

**ID:** T-005-001
**Story:** S-005-001
**Epic:** E-005
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers end-to-end push notification delivery via FCM: receiving a notification with the correct sender name, action type, and content preview; deep-linking from a tapped notification to the specific post or thread; re-registering an FCM token after OS refresh; and suppressing notifications for channels the user has disabled.

## Prerequisites

- FCM configured for the staging environment with all 5 channels (default, newPosts, newReplies, mentions, likes)
- Two test accounts in the same test group: User A (the recipient) and User B (the actor)
- User A's device registered with FCM and push notifications enabled at the OS level
- Ability to trigger server-side notification events (Verint staging or test harness)
- Ability to simulate FCM token refresh on a test device

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-005-001-001) | TC-005-001-001 (P0) | ✓ |
| AC-002 (TC-005-001-002) | TC-005-001-001 (P0), TC-005-001-002 | ✓ |
| AC-003 (TC-005-001-003) | TC-005-001-003 | ✓ |
| AC-004 (TC-005-001-004) | TC-005-001-004 | ✓ |

---

## Core Test Flow

### TC-005-001-001: User receives a reply notification and is deep-linked to the thread on tap

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** None

**Preconditions:**
- User A has push notifications enabled at the OS level
- User A has posted a thread in the shared test group
- User B is a member of the same test group

**Steps:**
1. User B replies to User A's post
2. Observe the push notification delivered to User A's device
3. Verify the notification shows: User B's name, action type ("replied"), and a preview of the reply text
4. Tap the notification
5. Observe the screen the app navigates to

**Expected Result:**
A push not

## Expected Result
# Test Plan: Push Notification Delivery

**ID:** T-005-001
**Story:** S-005-001
**Epic:** E-005
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers end-to-end push notification delivery via FCM: receiving a notification with the correct sender name, action type, and content preview; deep-linking from a tapped notification to the specific post or thread; re-registering an FCM token after OS refresh; and suppressing notifications for channels the user has disabled.

## Prerequisites

- FCM configured for the staging environment with all 5 channels (default, newPosts, newReplies, mentions, likes)
- Two test accounts in the same test group: User A (the recipient) and User B (the actor)
- User A's device registered with FCM and push notifications enabled at the OS level
- Ability to trigger server-side notification events (Verint staging or test harness)
- Ability to simulate FCM token refresh on a test device

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-005-001-001) | TC-005-001-001 (P0) | ✓ |
| AC-002 (TC-005-001-002) | TC-005-001-001 (P0), TC-005-001-002 | ✓ |
| AC-003 (TC-005-001-003) | TC-005-001-003 | ✓ |
| AC-004 (TC-005-001-004) | TC-005-001-004 | ✓ |

---

## Core Test Flow

### TC-005-001-001: User receives a reply notification and is deep-linked to the thread on tap

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** None

**Preconditions:**
- User A has push notifications enabled at the OS level
- User A has posted a thread in the shared test group
- User B is a member of the same test group

**Steps:**
1. User B replies to User A's post
2. Observe the push notification delivered to User A's device
3. Verify the notification shows: User B's name, action type ("replied"), and a preview of the reply text
4. Tap the notification
5. Observe the screen the app navigates to

**Expected Result:**
A push not

