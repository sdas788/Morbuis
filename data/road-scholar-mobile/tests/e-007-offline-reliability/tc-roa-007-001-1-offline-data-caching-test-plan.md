---
id: TC-ROA-007-001-1
title: Offline Data Caching — Test Plan
category: e-007-offline-reliability
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-007-001
  - e-007
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-007-001
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-007-offline-reliability/T-007-001-offline-data-caching.md
  source_checksum: 680839d0a423c738
---
## Steps
# Test Plan: Offline Data Caching

**ID:** T-007-001
**Story:** S-007-001
**Epic:** E-007
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers Redux Persist / AsyncStorage offline caching of group and thread data: browsing previously loaded content after network loss, cache invalidation and refresh on reconnect, and TTL expiry handling for stale cached data.

## Prerequisites

- Device or emulator with the ability to toggle network connectivity (airplane mode or network simulation)
- Test user authenticated and member of a group with at least one thread
- Ability to manipulate AsyncStorage cache timestamps for the TTL expiry test
- S-007-003 (offline banner) is deployed — cache tests rely on the banner for connectivity feedback

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-007-001-001) | TC-007-001-001 (P0) | ✓ |
| AC-002 (TC-007-001-002) | TC-007-001-001 (P0), TC-007-001-002 | ✓ |
| AC-003 (TC-007-001-003) | TC-007-001-003 | ✓ |
| AC-004 (TC-007-001-004) | TC-007-001-004 | ✓ |

---

## Core Test Flow

### TC-007-001-001: Previously loaded groups and threads are viewable after network drops

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** None

**Preconditions:**
- User has opened their groups list and navigated into at least one group thread while online
- Data is confirmed to be cached (network was available during initial load)

**Steps:**
1. Disable network connectivity (airplane mode)
2. Navigate to the groups list
3. Tap into a previously loaded group
4. Navigate to a previously loaded thread within the group

**Expected Result:**
The groups list renders with cached group entries. The group and its thread content are viewable without errors. No blank screens or API error messages appear.

**Failure Indicators:**
Groups list is blank or shows an error; group thread shows a loading state indefinitely; 

## Expected Result
# Test Plan: Offline Data Caching

**ID:** T-007-001
**Story:** S-007-001
**Epic:** E-007
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers Redux Persist / AsyncStorage offline caching of group and thread data: browsing previously loaded content after network loss, cache invalidation and refresh on reconnect, and TTL expiry handling for stale cached data.

## Prerequisites

- Device or emulator with the ability to toggle network connectivity (airplane mode or network simulation)
- Test user authenticated and member of a group with at least one thread
- Ability to manipulate AsyncStorage cache timestamps for the TTL expiry test
- S-007-003 (offline banner) is deployed — cache tests rely on the banner for connectivity feedback

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-007-001-001) | TC-007-001-001 (P0) | ✓ |
| AC-002 (TC-007-001-002) | TC-007-001-001 (P0), TC-007-001-002 | ✓ |
| AC-003 (TC-007-001-003) | TC-007-001-003 | ✓ |
| AC-004 (TC-007-001-004) | TC-007-001-004 | ✓ |

---

## Core Test Flow

### TC-007-001-001: Previously loaded groups and threads are viewable after network drops

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** None

**Preconditions:**
- User has opened their groups list and navigated into at least one group thread while online
- Data is confirmed to be cached (network was available during initial load)

**Steps:**
1. Disable network connectivity (airplane mode)
2. Navigate to the groups list
3. Tap into a previously loaded group
4. Navigate to a previously loaded thread within the group

**Expected Result:**
The groups list renders with cached group entries. The group and its thread content are viewable without errors. No blank screens or API error messages appear.

**Failure Indicators:**
Groups list is blank or shows an error; group thread shows a loading state indefinitely; 

