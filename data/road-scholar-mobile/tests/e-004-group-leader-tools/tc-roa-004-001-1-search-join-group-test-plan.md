---
id: TC-ROA-004-001-1
title: Search & Join Group — Test Plan
category: e-004-group-leader-tools
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-004-001
  - e-004
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-004-001
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-004-group-leader-tools/T-004-001-search-join-group.md
  source_checksum: da71089ecd85a395
---
## Steps
# Test Plan: Search & Join Group

**ID:** T-004-001
**Story:** S-004-001
**Epic:** E-004
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers the group leader self-serve join flow: entering a program number, searching the Verint API with a group-leader authorization header, viewing matching results, and joining a group. It also validates role-based access control (non-leaders denied) and the no-match empty state.

## Prerequisites

- Test environment connected to a Verint API staging instance
- Two test accounts: one with the group-leader role, one standard participant
- At least one known valid program number in the Verint staging environment
- At least one known invalid program number (no groups exist)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-004-001-001) | TC-004-001-001 (P0) | ✓ |
| AC-002 (TC-004-001-002) | TC-004-001-001 (P0), TC-004-001-002 | ✓ |
| AC-003 (TC-004-001-003) | TC-004-001-003 | ✓ |
| AC-004 (TC-004-001-004) | TC-004-001-004 | ✓ |

---

## Core Test Flow

### TC-004-001-001: Leader searches a valid program number, sees a match, and joins the group

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** None

**Preconditions:**
- Authenticated as a user with the group-leader role
- Valid program number known (e.g., #12345) with a corresponding group in the Verint staging environment
- User is not already a member of that group

**Steps:**
1. Navigate to the Join Group screen
2. Enter the valid program number in the input field
3. Confirm the search results list appears with the matching group, showing program name and dates
4. Tap the Join button for the matching group

**Expected Result:**
The leader is added to the group. The app navigates to the Group Details screen for that group. The group appears in the leader's groups list.

**Failure Indicators:**
Search returns no results for a val

## Expected Result
# Test Plan: Search & Join Group

**ID:** T-004-001
**Story:** S-004-001
**Epic:** E-004
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

This test plan covers the group leader self-serve join flow: entering a program number, searching the Verint API with a group-leader authorization header, viewing matching results, and joining a group. It also validates role-based access control (non-leaders denied) and the no-match empty state.

## Prerequisites

- Test environment connected to a Verint API staging instance
- Two test accounts: one with the group-leader role, one standard participant
- At least one known valid program number in the Verint staging environment
- At least one known invalid program number (no groups exist)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (TC-004-001-001) | TC-004-001-001 (P0) | ✓ |
| AC-002 (TC-004-001-002) | TC-004-001-001 (P0), TC-004-001-002 | ✓ |
| AC-003 (TC-004-001-003) | TC-004-001-003 | ✓ |
| AC-004 (TC-004-001-004) | TC-004-001-004 | ✓ |

---

## Core Test Flow

### TC-004-001-001: Leader searches a valid program number, sees a match, and joins the group

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** None

**Preconditions:**
- Authenticated as a user with the group-leader role
- Valid program number known (e.g., #12345) with a corresponding group in the Verint staging environment
- User is not already a member of that group

**Steps:**
1. Navigate to the Join Group screen
2. Enter the valid program number in the input field
3. Confirm the search results list appears with the matching group, showing program name and dates
4. Tap the Join button for the matching group

**Expected Result:**
The leader is added to the group. The app navigates to the Group Details screen for that group. The group appears in the leader's groups list.

**Failure Indicators:**
Search returns no results for a val

