---
id: TC-CH--008-002-1
title: Action-Triggered Notifications — Test Plan
category: e-008-push-notifications
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-008-002
  - e-008
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-008-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-008-push-notifications/T-008-002-action-triggered-notifications.md
  source_checksum: b2e94c5b39b9e8cf
---
## Steps
# Test Plan: Action-Triggered Notifications

**ID:** T-008-002
**Project:** ch-mobile
**Story:** S-008-002
**Epic:** E-008
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that when a server-sent push notification arrives and the member taps it, the app reads the `notification.navigateTo` field from the payload and routes to the corresponding screen via `navigate(notification.navigateTo)`. When `navigateTo` is missing or unrecognized, the app falls back to default navigation (no targeted screen change). Confirms guest users (no registered token) receive no notifications. The app is the delivery endpoint only — trigger logic, content, and category routing are server-owned and not under test here.

## Prerequisites

- S-008-001 (Device Token Registration) is Done — test member has a registered FCM/APNs token
- Test member account signed in on a real device (iOS) or emulator with Play Services (Android); permission granted
- Tester can send arbitrary push notifications to the device, e.g. via Firebase Cloud Messaging Console with custom data payload, the SFMC test send tool, or a back-end utility that issues pushes with custom `navigateTo` values
- Knowledge of the app's navigator screen names: `Rewards`, `Dashboard`, `Account`, `OpenChecks`, `Reservations`, `Bottles`, etc. (the strings expected by `navigate(...)`)
- Network capture / Firebase audit available to confirm a push was issued for the negative guest-user case

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (`navigateTo: "Rewards"` tap → Rewards screen) | TC-008-002-001 (P0), TC-008-002-006 | ✓ |
| AC-002 (no `navigateTo` → app opens, no targeted change) | TC-008-002-001 (P0), TC-008-002-002 | ✓ |
| AC-003 (guest user — no notification because no token) | TC-008-002-001 (P0), TC-008-002-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P

## Expected Result
# Test Plan: Action-Triggered Notifications

**ID:** T-008-002
**Project:** ch-mobile
**Story:** S-008-002
**Epic:** E-008
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that when a server-sent push notification arrives and the member taps it, the app reads the `notification.navigateTo` field from the payload and routes to the corresponding screen via `navigate(notification.navigateTo)`. When `navigateTo` is missing or unrecognized, the app falls back to default navigation (no targeted screen change). Confirms guest users (no registered token) receive no notifications. The app is the delivery endpoint only — trigger logic, content, and category routing are server-owned and not under test here.

## Prerequisites

- S-008-001 (Device Token Registration) is Done — test member has a registered FCM/APNs token
- Test member account signed in on a real device (iOS) or emulator with Play Services (Android); permission granted
- Tester can send arbitrary push notifications to the device, e.g. via Firebase Cloud Messaging Console with custom data payload, the SFMC test send tool, or a back-end utility that issues pushes with custom `navigateTo` values
- Knowledge of the app's navigator screen names: `Rewards`, `Dashboard`, `Account`, `OpenChecks`, `Reservations`, `Bottles`, etc. (the strings expected by `navigate(...)`)
- Network capture / Firebase audit available to confirm a push was issued for the negative guest-user case

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (`navigateTo: "Rewards"` tap → Rewards screen) | TC-008-002-001 (P0), TC-008-002-006 | ✓ |
| AC-002 (no `navigateTo` → app opens, no targeted change) | TC-008-002-001 (P0), TC-008-002-002 | ✓ |
| AC-003 (guest user — no notification because no token) | TC-008-002-001 (P0), TC-008-002-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P

