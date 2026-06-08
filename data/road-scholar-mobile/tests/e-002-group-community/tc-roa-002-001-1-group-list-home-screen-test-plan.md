---
id: TC-ROA-002-001-1
title: Group List (Home Screen) — Test Plan
category: e-002-group-community
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-001
  - e-002
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-002-001
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-002-group-community/T-002-001-group-list.md
  source_checksum: da9cb732a4362563
---
## Steps
# Test Plan: Group List (Home Screen)

**ID:** T-002-001
**Story:** S-002-001
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the home screen group list: all groups belonging to the authenticated user are displayed with the latest thread preview and unread indicator, an empty state is shown when the user has no groups, and pull-to-refresh fetches updated data.

## Prerequisites

- Authenticated test user with at least 3 groups in Verint staging
- Second test account with no group memberships for empty state test
- Verint API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (3 groups shown with latest thread preview) | TC-002-001-001 (P0) | ✓ |
| AC-002 (no groups → empty state) | TC-002-001-002 | ✓ |
| AC-003 (pull to refresh → updated data) | TC-002-001-003 | ✓ |
| AC-004 (group with unread posts → unread indicator visible) | TC-002-001-004 | ✓ |

---

## Core Test Flow

### TC-002-001-001: Home screen shows all user groups with latest thread preview for each

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-004
**Dependencies:** TC-001-001-001

**Preconditions:**
- Test user is a member of exactly 3 groups in Verint
- Each group has at least one thread
- At least one group has unread posts

**Steps:**
1. Complete SSO login with the multi-group test account
2. Land on the home screen
3. Observe the group cards displayed

**Expected Result:**
All 3 group cards are visible. Each card shows: group name, program image, latest thread preview. At least one card shows an unread indicator for the group with unread posts.

**Failure Indicators:**
Fewer than 3 groups shown; thread preview is missing or blank; unread indicator absent on a group with unread content; groups from another user appear.

---

## Sub Flows

### TC-002-001-002: User with no groups sees empty state message

**Type:** Negative
**Priority:** P

## Expected Result
# Test Plan: Group List (Home Screen)

**ID:** T-002-001
**Story:** S-002-001
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the home screen group list: all groups belonging to the authenticated user are displayed with the latest thread preview and unread indicator, an empty state is shown when the user has no groups, and pull-to-refresh fetches updated data.

## Prerequisites

- Authenticated test user with at least 3 groups in Verint staging
- Second test account with no group memberships for empty state test
- Verint API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (3 groups shown with latest thread preview) | TC-002-001-001 (P0) | ✓ |
| AC-002 (no groups → empty state) | TC-002-001-002 | ✓ |
| AC-003 (pull to refresh → updated data) | TC-002-001-003 | ✓ |
| AC-004 (group with unread posts → unread indicator visible) | TC-002-001-004 | ✓ |

---

## Core Test Flow

### TC-002-001-001: Home screen shows all user groups with latest thread preview for each

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-004
**Dependencies:** TC-001-001-001

**Preconditions:**
- Test user is a member of exactly 3 groups in Verint
- Each group has at least one thread
- At least one group has unread posts

**Steps:**
1. Complete SSO login with the multi-group test account
2. Land on the home screen
3. Observe the group cards displayed

**Expected Result:**
All 3 group cards are visible. Each card shows: group name, program image, latest thread preview. At least one card shows an unread indicator for the group with unread posts.

**Failure Indicators:**
Fewer than 3 groups shown; thread preview is missing or blank; unread indicator absent on a group with unread content; groups from another user appear.

---

## Sub Flows

### TC-002-001-002: User with no groups sees empty state message

**Type:** Negative
**Priority:** P

