---
id: TC-ROA-007-004-1
title: Forced Update Check — Test Plan
category: e-007-offline-reliability
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-007-004
  - e-007
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-007-004
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-007-offline-reliability/T-007-004-forced-update-check.md
  source_checksum: 627ce769225ff71f
---
## Steps
# Test Plan: Forced Update Check

**ID:** T-007-004
**Story:** S-007-004
**Epic:** E-007
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers the forced update check on app launch via Firebase Remote Config: displaying a blocking modal for critically outdated builds, showing a dismissable prompt for optional updates, loading normally when the version meets all thresholds, and failing open (no modal) when Remote Config is unreachable.

## Prerequisites

- Firebase Remote Config accessible in the staging environment
- Ability to set `minimum_required_version` and `latest_optional_version` values in Firebase Remote Config for the test environment
- Test builds with version numbers: one below minimum, one meeting minimum but below optional, one meeting both thresholds
- Ability to block Firebase Remote Config network access for the fail-open test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-007-004-001) | TC-007-004-001 (P0) | ✓ |
| AC-002 (TC-007-004-002) | TC-007-004-002 | ✓ |
| AC-003 (TC-007-004-003) | TC-007-004-003 | ✓ |
| AC-004 (TC-007-004-004) | TC-007-004-004 | ✓ |

---

## Core Test Flow

### TC-007-004-001: App below minimum required version shows a non-dismissable blocking modal with App Store link

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

**Preconditions:**
- Firebase Remote Config set to: `minimum_required_version = 2.0.0`, `latest_optional_version = 2.1.0`
- Test build version is `1.5.0` (below minimum)

**Steps:**
1. Launch the app
2. Observe the screen shown immediately after launch

**Expected Result:**
A blocking modal appears. The modal cannot be dismissed (no close button, back gesture has no effect). The modal contains a button that links to the App Store. The user cannot access any other part of the app.

**Failure Indicators:**
No modal shown; modal can be dismissed; App Store li

## Expected Result
# Test Plan: Forced Update Check

**ID:** T-007-004
**Story:** S-007-004
**Epic:** E-007
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers the forced update check on app launch via Firebase Remote Config: displaying a blocking modal for critically outdated builds, showing a dismissable prompt for optional updates, loading normally when the version meets all thresholds, and failing open (no modal) when Remote Config is unreachable.

## Prerequisites

- Firebase Remote Config accessible in the staging environment
- Ability to set `minimum_required_version` and `latest_optional_version` values in Firebase Remote Config for the test environment
- Test builds with version numbers: one below minimum, one meeting minimum but below optional, one meeting both thresholds
- Ability to block Firebase Remote Config network access for the fail-open test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-007-004-001) | TC-007-004-001 (P0) | ✓ |
| AC-002 (TC-007-004-002) | TC-007-004-002 | ✓ |
| AC-003 (TC-007-004-003) | TC-007-004-003 | ✓ |
| AC-004 (TC-007-004-004) | TC-007-004-004 | ✓ |

---

## Core Test Flow

### TC-007-004-001: App below minimum required version shows a non-dismissable blocking modal with App Store link

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

**Preconditions:**
- Firebase Remote Config set to: `minimum_required_version = 2.0.0`, `latest_optional_version = 2.1.0`
- Test build version is `1.5.0` (below minimum)

**Steps:**
1. Launch the app
2. Observe the screen shown immediately after launch

**Expected Result:**
A blocking modal appears. The modal cannot be dismissed (no close button, back gesture has no effect). The modal contains a button that links to the App Store. The user cannot access any other part of the app.

**Failure Indicators:**
No modal shown; modal can be dismissed; App Store li

