---
id: TC-ROA-002-006-1
title: Likes — Test Plan
category: e-002-group-community
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-002-006
  - e-002
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-002-006
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-002-group-community/T-002-006-likes.md
  source_checksum: 5eec677c56c8ef11
---
## Steps
# Test Plan: Likes

**ID:** T-002-006
**Story:** S-002-006
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the like and unlike feature: optimistic UI updates the like count immediately on tap, offline likes are queued and synced on reconnect, the "liked by" modal shows the correct user list, and a user cannot like a post more than once.

## Prerequisites

- Test user is a member of a group with at least one post
- Test device able to simulate offline state
- Verint staging API accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (offline like → queued and synced on reconnect) | TC-002-006-001 (P0) | ✓ |
| AC-002 (tap liked-by count → modal with user list) | TC-002-006-002 | ✓ |
| AC-003 (online like → optimistic count increment + API confirm) | TC-002-006-003 | ✓ |
| AC-004 (unlike → count decrements) | TC-002-006-004 | ✓ |

---

## Core Test Flow

### TC-002-006-001: Offline like — queued locally and synced when connectivity is restored

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-002-002-001

**Preconditions:**
- User is viewing a post (forum or detail view)
- Device network connectivity is disabled

**Steps:**
1. Disable network connectivity on the device
2. Tap the like button on a post
3. Observe the like count change
4. Re-enable network connectivity
5. Observe whether the like is synced to the API

**Expected Result:**
The like count increments immediately (optimistic). The like action is queued locally. When connectivity is restored, the like is synced to Verint. The final like count matches the server state.

**Failure Indicators:**
Like count does not update while offline; like is lost after reconnecting; app crashes when tapping like offline; like is synced multiple times.

---

## Sub Flows

### TC-002-006-002: Tapping the liked-by count opens a modal with the list of users

**Type:** E2

## Expected Result
# Test Plan: Likes

**ID:** T-002-006
**Story:** S-002-006
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the like and unlike feature: optimistic UI updates the like count immediately on tap, offline likes are queued and synced on reconnect, the "liked by" modal shows the correct user list, and a user cannot like a post more than once.

## Prerequisites

- Test user is a member of a group with at least one post
- Test device able to simulate offline state
- Verint staging API accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (offline like → queued and synced on reconnect) | TC-002-006-001 (P0) | ✓ |
| AC-002 (tap liked-by count → modal with user list) | TC-002-006-002 | ✓ |
| AC-003 (online like → optimistic count increment + API confirm) | TC-002-006-003 | ✓ |
| AC-004 (unlike → count decrements) | TC-002-006-004 | ✓ |

---

## Core Test Flow

### TC-002-006-001: Offline like — queued locally and synced when connectivity is restored

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-002-002-001

**Preconditions:**
- User is viewing a post (forum or detail view)
- Device network connectivity is disabled

**Steps:**
1. Disable network connectivity on the device
2. Tap the like button on a post
3. Observe the like count change
4. Re-enable network connectivity
5. Observe whether the like is synced to the API

**Expected Result:**
The like count increments immediately (optimistic). The like action is queued locally. When connectivity is restored, the like is synced to Verint. The final like count matches the server state.

**Failure Indicators:**
Like count does not update while offline; like is lost after reconnecting; app crashes when tapping like offline; like is synced multiple times.

---

## Sub Flows

### TC-002-006-002: Tapping the liked-by count opens a modal with the list of users

**Type:** E2

