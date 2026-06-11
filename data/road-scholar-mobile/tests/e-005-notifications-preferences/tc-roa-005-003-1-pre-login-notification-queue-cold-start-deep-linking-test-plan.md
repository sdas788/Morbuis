---
id: TC-ROA-005-003-1
title: Pre-Login Notification Queue & Cold-Start Deep Linking — Test Plan
category: e-005-notifications-preferences
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-005-003
  - e-005
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-005-003
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-005-notifications-preferences/T-005-003-pre-login-notification-queue.md
  source_checksum: 20f19ac87b5aacb4
---
## Steps
# Test Plan: Pre-Login Notification Queue & Cold-Start Deep Linking

**ID:** T-005-003
**Story:** S-005-003
**Epic:** E-005
**Project:** roadscholar-mobile
**Created:** 2026-05-22
**Updated:** 2026-05-22
**Version:** 1.0

---

## Scope

Exercises the off-path notification flow: app-killed cold-start with a queued notification, pre-login arrival, listener-readiness gating, malformed-URL handling, fallback to non-push deep link, error-resilient listener init, per-forum topic subscription on group join, FCM token rotation on foreground, and the background-press (non-queue) path. The on-arrival happy path is covered by T-005-001.

## Prerequisites

- Two test devices: device A (recipient, target of the cold-start scenarios), device B (actor, used to trigger pushes from another account)
- Two test accounts both registered in `RS-TEST-GROUP-A`: `rs-test-returning-participant` (recipient) and `rs-test-second-participant` (actor)
- FCM staging configured; ability to send a known-payload push to a specific device token (either via Firebase Console or a `POST /test-push` backend hook)
- Ability to force-stop / cold-start the app on both iOS (swipe-up from app switcher) and Android (force-stop in OS settings)
- Ability to backdate the access token (same dev harness TF-001 Journey C uses) — required for TC-005-003-009's pre-login arrival case
- Reactotron or Flipper attached to device A for Redux state inspection during TC-005-003-001 and TC-005-003-003
- Ability to publish a push payload with a deliberately malformed `url` field (e.g. `https://evil.example.com/foo` instead of `roadscholar://post/123`) — needed for TC-005-003-004
- The configured `APP_URL_SCHEME` (in `react-native-config`) — typically `roadscholar`

## AC Coverage Map

| AC | Test Cases | Priority |
|----|-----------|----------|
| AC-001 (TC-005-003-001) | TC-005-003-001 | P0 |
| AC-002 (TC-005-003-002) | TC-005-003-002 | P0 |
| AC-003 (TC-005-003-003) | TC-005-003-003 | P1 |
| AC-004 (TC-005-003-004) | TC-005-

## Expected Result
# Test Plan: Pre-Login Notification Queue & Cold-Start Deep Linking

**ID:** T-005-003
**Story:** S-005-003
**Epic:** E-005
**Project:** roadscholar-mobile
**Created:** 2026-05-22
**Updated:** 2026-05-22
**Version:** 1.0

---

## Scope

Exercises the off-path notification flow: app-killed cold-start with a queued notification, pre-login arrival, listener-readiness gating, malformed-URL handling, fallback to non-push deep link, error-resilient listener init, per-forum topic subscription on group join, FCM token rotation on foreground, and the background-press (non-queue) path. The on-arrival happy path is covered by T-005-001.

## Prerequisites

- Two test devices: device A (recipient, target of the cold-start scenarios), device B (actor, used to trigger pushes from another account)
- Two test accounts both registered in `RS-TEST-GROUP-A`: `rs-test-returning-participant` (recipient) and `rs-test-second-participant` (actor)
- FCM staging configured; ability to send a known-payload push to a specific device token (either via Firebase Console or a `POST /test-push` backend hook)
- Ability to force-stop / cold-start the app on both iOS (swipe-up from app switcher) and Android (force-stop in OS settings)
- Ability to backdate the access token (same dev harness TF-001 Journey C uses) — required for TC-005-003-009's pre-login arrival case
- Reactotron or Flipper attached to device A for Redux state inspection during TC-005-003-001 and TC-005-003-003
- Ability to publish a push payload with a deliberately malformed `url` field (e.g. `https://evil.example.com/foo` instead of `roadscholar://post/123`) — needed for TC-005-003-004
- The configured `APP_URL_SCHEME` (in `react-native-config`) — typically `roadscholar`

## AC Coverage Map

| AC | Test Cases | Priority |
|----|-----------|----------|
| AC-001 (TC-005-003-001) | TC-005-003-001 | P0 |
| AC-002 (TC-005-003-002) | TC-005-003-002 | P0 |
| AC-003 (TC-005-003-003) | TC-005-003-003 | P1 |
| AC-004 (TC-005-003-004) | TC-005-

