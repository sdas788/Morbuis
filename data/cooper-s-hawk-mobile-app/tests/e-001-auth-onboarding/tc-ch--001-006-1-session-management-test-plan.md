---
id: TC-CH--001-006-1
title: Session Management — Test Plan
category: e-001-auth-onboarding
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-006
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-006
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-006-session-management.md
  source_checksum: f5dcfda06aef865e
---
## Steps
# Test Plan: Session Management

**ID:** T-001-006
**Project:** ch-mobile
**Story:** S-001-006
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate the JWT session lifecycle: launch-time silent restore, proactive 5-minute-pre-expiry refresh, reactive refresh on 401 with single-flight queueing, exponential-backoff retry on transient refresh failure (1s/2s/4s, max 2 retries), Keychain blob containing access token + refresh token + username + password, full clear on logout (`DELETE /session` + Keychain wipe + cached data purge + Firebase user identity reset), and background-resume token refresh. Authorization header must be attached to every authenticated request.

## Prerequisites

- Authenticated test member `qa-session@chwinery.test` who can be issued short-lived JWTs (e.g. 6-minute access token via a staging-only short-token feature flag, so proactive-refresh and reactive-refresh paths are observable inside a test run)
- A mock layer or staging fault-injector for `/session/refresh` to return transient 5xx and 401
- Network-throttling and offline toggling on the test device
- Debug build that exposes a Keychain inspector or a script that dumps the `react-native-keychain` blob
- Firebase staging project with analytics enabled so user-identity clearing can be observed

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Stored token still valid → land on dashboard) | TC-001-006-001 (P0) | ✓ |
| AC-002 (Proactive refresh ≈ 5 min before expiry) | TC-001-006-001 (P0), TC-001-006-002 | ✓ |
| AC-003 (401 → refresh + retry original request) | TC-001-006-001 (P0), TC-001-006-003 | ✓ |
| AC-004 (Concurrent 401s share a single in-flight refresh) | TC-001-006-001 (P0), TC-001-006-004 | ✓ |
| AC-005 (Transient refresh failure → exp backoff 1s/2s/4s, max 2 retries) | TC-001-006-005 | ✓ |
| AC-006 (All retries 401 → clear Keychain + Initial screen) | TC-001-006-006 | ✓ |
| 

## Expected Result
# Test Plan: Session Management

**ID:** T-001-006
**Project:** ch-mobile
**Story:** S-001-006
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate the JWT session lifecycle: launch-time silent restore, proactive 5-minute-pre-expiry refresh, reactive refresh on 401 with single-flight queueing, exponential-backoff retry on transient refresh failure (1s/2s/4s, max 2 retries), Keychain blob containing access token + refresh token + username + password, full clear on logout (`DELETE /session` + Keychain wipe + cached data purge + Firebase user identity reset), and background-resume token refresh. Authorization header must be attached to every authenticated request.

## Prerequisites

- Authenticated test member `qa-session@chwinery.test` who can be issued short-lived JWTs (e.g. 6-minute access token via a staging-only short-token feature flag, so proactive-refresh and reactive-refresh paths are observable inside a test run)
- A mock layer or staging fault-injector for `/session/refresh` to return transient 5xx and 401
- Network-throttling and offline toggling on the test device
- Debug build that exposes a Keychain inspector or a script that dumps the `react-native-keychain` blob
- Firebase staging project with analytics enabled so user-identity clearing can be observed

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Stored token still valid → land on dashboard) | TC-001-006-001 (P0) | ✓ |
| AC-002 (Proactive refresh ≈ 5 min before expiry) | TC-001-006-001 (P0), TC-001-006-002 | ✓ |
| AC-003 (401 → refresh + retry original request) | TC-001-006-001 (P0), TC-001-006-003 | ✓ |
| AC-004 (Concurrent 401s share a single in-flight refresh) | TC-001-006-001 (P0), TC-001-006-004 | ✓ |
| AC-005 (Transient refresh failure → exp backoff 1s/2s/4s, max 2 retries) | TC-001-006-005 | ✓ |
| AC-006 (All retries 401 → clear Keychain + Initial screen) | TC-001-006-006 | ✓ |
| 

