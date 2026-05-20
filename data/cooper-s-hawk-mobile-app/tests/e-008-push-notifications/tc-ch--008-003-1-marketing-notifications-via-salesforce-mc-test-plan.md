---
id: TC-CH--008-003-1
title: Marketing Notifications via Salesforce MC — Test Plan
category: e-008-push-notifications
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-008-003
  - e-008
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-008-003
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-008-push-notifications/T-008-003-marketing-notifications.md
  source_checksum: 787611b8036acd4e
---
## Steps
# Test Plan: Marketing Notifications via Salesforce MC

**ID:** T-008-003
**Project:** ch-mobile
**Story:** S-008-003
**Epic:** E-008
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that the Salesforce Marketing Cloud (SFMC) MobilePush SDK is initialised on iOS (`MarketingCloudSDK` pod) and Android (`SFMCSdk` + `MarketingCloudConfig`), and that on Dashboard mount after sign-in the app calls `MCReactModule.setContactKey(marketingId)`, pushes the baseline contact attributes (`email`, `customerId`, `deviceId`, `firstName`, `lastName`) via `setAttribute`, and calls `MCReactModule.enablePush()`. Confirms that marketing notifications with `navigateTo` route through the same `useNotifications` handler used by all server pushes. Campaign content and scheduling are owned by SFMC and out of scope.

## Prerequisites

- S-008-001 (Device Token Registration) is Done — device token registered with the back end
- Non-prod SFMC environment configured with test contact records whose Contact IDs match the test member's `marketingId` in the QA back end
- iOS test build includes the `MarketingCloudSDK` pod (≥ 8.1.4) and Android build initialises `SFMCSdk` with `MarketingCloudConfig`
- Tester has access to SFMC MobilePush console to send test campaigns and inspect contact attributes
- Test member account with non-empty `marketingId`, `email`, `customerId`, `deviceId`, `firstName`, `lastName`
- Native log access (Xcode Console for iOS, `adb logcat` for Android) to confirm SDK init and `MCReactModule` calls
- Real iOS device for delivery verification; Android emulator with Play Services is acceptable

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (SDK initialised on iOS + Android at app start) | TC-008-003-001 (P0), TC-008-003-002 | ✓ |
| AC-002 (`setContactKey(marketingId)` on Dashboard mount) | TC-008-003-001 (P0), TC-008-003-005 | ✓ |
| AC-003 (5 baseline attributes pushed via `setAtt

## Expected Result
# Test Plan: Marketing Notifications via Salesforce MC

**ID:** T-008-003
**Project:** ch-mobile
**Story:** S-008-003
**Epic:** E-008
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies that the Salesforce Marketing Cloud (SFMC) MobilePush SDK is initialised on iOS (`MarketingCloudSDK` pod) and Android (`SFMCSdk` + `MarketingCloudConfig`), and that on Dashboard mount after sign-in the app calls `MCReactModule.setContactKey(marketingId)`, pushes the baseline contact attributes (`email`, `customerId`, `deviceId`, `firstName`, `lastName`) via `setAttribute`, and calls `MCReactModule.enablePush()`. Confirms that marketing notifications with `navigateTo` route through the same `useNotifications` handler used by all server pushes. Campaign content and scheduling are owned by SFMC and out of scope.

## Prerequisites

- S-008-001 (Device Token Registration) is Done — device token registered with the back end
- Non-prod SFMC environment configured with test contact records whose Contact IDs match the test member's `marketingId` in the QA back end
- iOS test build includes the `MarketingCloudSDK` pod (≥ 8.1.4) and Android build initialises `SFMCSdk` with `MarketingCloudConfig`
- Tester has access to SFMC MobilePush console to send test campaigns and inspect contact attributes
- Test member account with non-empty `marketingId`, `email`, `customerId`, `deviceId`, `firstName`, `lastName`
- Native log access (Xcode Console for iOS, `adb logcat` for Android) to confirm SDK init and `MCReactModule` calls
- Real iOS device for delivery verification; Android emulator with Play Services is acceptable

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (SDK initialised on iOS + Android at app start) | TC-008-003-001 (P0), TC-008-003-002 | ✓ |
| AC-002 (`setContactKey(marketingId)` on Dashboard mount) | TC-008-003-001 (P0), TC-008-003-005 | ✓ |
| AC-003 (5 baseline attributes pushed via `setAtt

