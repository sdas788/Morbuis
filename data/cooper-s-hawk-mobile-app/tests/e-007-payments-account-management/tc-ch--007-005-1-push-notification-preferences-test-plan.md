---
id: TC-CH--007-005-1
title: Push Notification Preferences — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-007-005
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-005
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-005-push-notification-preferences.md
  source_checksum: 34a7cd14afbd9869
---
## Steps
# Test Plan: Push Notification Preferences

**ID:** T-007-005
**Project:** ch-mobile
**Story:** S-007-005
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the push notification toggle in Account Settings reflects the server-side preference, drives `PUT /customer/push-notification` on toggle changes, requests OS permission only when toggling on, surfaces a settings-deeplink message if OS permission is denied, reverts on API failure, and shows a loading indicator during the call.

## Prerequisites

- Test member account with a known initial server preference (e.g., disabled)
- iOS simulator and Android emulator available for OS-permission state manipulation
- Stagable `PUT /customer/push-notification` endpoint (toggleable to error)
- Ability to grant/deny notification permission in OS settings

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (toggle reflects server preference) | TC-007-005-001 (P0) | ✓ |
| AC-002 (toggle on → API ok → OS permission requested if needed) | TC-007-005-001 (P0), TC-007-005-002 | ✓ |
| AC-003 (toggle off → API ok → no further notifications) | TC-007-005-001 (P0) | ✓ |
| AC-004 (API failure → revert + error) | TC-007-005-001 (P0), TC-007-005-003 | ✓ |
| AC-005 (OS denied → settings message) | TC-007-005-001 (P0), TC-007-005-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-005-001: Member loads preference, enables push (granting OS permission), disables it, observes API failure rollback, and confirms denied OS permission shows the settings message

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-account | default |
| toggle-off-default | DS-push-pref | default |
| os-permission-prompt | DS-p

## Expected Result
# Test Plan: Push Notification Preferences

**ID:** T-007-005
**Project:** ch-mobile
**Story:** S-007-005
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the push notification toggle in Account Settings reflects the server-side preference, drives `PUT /customer/push-notification` on toggle changes, requests OS permission only when toggling on, surfaces a settings-deeplink message if OS permission is denied, reverts on API failure, and shows a loading indicator during the call.

## Prerequisites

- Test member account with a known initial server preference (e.g., disabled)
- iOS simulator and Android emulator available for OS-permission state manipulation
- Stagable `PUT /customer/push-notification` endpoint (toggleable to error)
- Ability to grant/deny notification permission in OS settings

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (toggle reflects server preference) | TC-007-005-001 (P0) | ✓ |
| AC-002 (toggle on → API ok → OS permission requested if needed) | TC-007-005-001 (P0), TC-007-005-002 | ✓ |
| AC-003 (toggle off → API ok → no further notifications) | TC-007-005-001 (P0) | ✓ |
| AC-004 (API failure → revert + error) | TC-007-005-001 (P0), TC-007-005-003 | ✓ |
| AC-005 (OS denied → settings message) | TC-007-005-001 (P0), TC-007-005-004 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-005-001: Member loads preference, enables push (granting OS permission), disables it, observes API failure rollback, and confirms denied OS permission shows the settings message

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005
**Dependencies:** None

**Captures:**
| Label | Screen | State |
|-------|--------|-------|
| before | DS-account | default |
| toggle-off-default | DS-push-pref | default |
| os-permission-prompt | DS-p

