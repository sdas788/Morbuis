---
id: TC-ROA-002-007-1
title: Mentions — Test Plan
category: e-002-group-community
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-002-007
  - e-002
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-002-007
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-002-group-community/T-002-007-mentions.md
  source_checksum: 78164caacf10fce9
---
## Steps
# Test Plan: Mentions

**ID:** T-002-007
**Story:** S-002-007
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies @mention autocomplete in the post and reply composers: typing `@` followed by a name fragment shows matching group members, selecting from the dropdown inserts the mention, a post with a mention sends a push notification to the mentioned user (if enabled), and no match clears the dropdown.

## Prerequisites

- Test group with at least 3 named members (to test autocomplete matching)
- Push notifications enabled for the mentioned test user
- Staging Verint and Firebase accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (`@` + name fragment → autocomplete dropdown shown) | TC-002-007-001 (P0) | ✓ |
| AC-002 (select from dropdown → mention inserted into composer) | TC-002-007-001 (P0) | ✓ |
| AC-003 (mention in submitted post → push notification to mentioned user) | TC-002-007-002 | ✓ |
| AC-004 (`@` with no matches → dropdown dismissed) | TC-002-007-003 | ✓ |

---

## Core Test Flow

### TC-002-007-001: Type `@` with name fragment — autocomplete shows matches and selection inserts mention

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-002-003-001 or TC-002-005-001

**Preconditions:**
- User has the post or reply composer open
- Test group has members with known display names
- Network connectivity active

**Steps:**
1. Tap into the body field of the New Post modal or the reply input bar
2. Type `@` followed by at least one character matching a group member's display name
3. Observe the autocomplete dropdown
4. Tap a member from the dropdown list

**Expected Result:**
An autocomplete dropdown appears showing matching group members by display name. After tapping a member, their mention is inserted into the composer text at the cursor position. The dropdown dismisses.

**Failure Indicators

## Expected Result
# Test Plan: Mentions

**ID:** T-002-007
**Story:** S-002-007
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies @mention autocomplete in the post and reply composers: typing `@` followed by a name fragment shows matching group members, selecting from the dropdown inserts the mention, a post with a mention sends a push notification to the mentioned user (if enabled), and no match clears the dropdown.

## Prerequisites

- Test group with at least 3 named members (to test autocomplete matching)
- Push notifications enabled for the mentioned test user
- Staging Verint and Firebase accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (`@` + name fragment → autocomplete dropdown shown) | TC-002-007-001 (P0) | ✓ |
| AC-002 (select from dropdown → mention inserted into composer) | TC-002-007-001 (P0) | ✓ |
| AC-003 (mention in submitted post → push notification to mentioned user) | TC-002-007-002 | ✓ |
| AC-004 (`@` with no matches → dropdown dismissed) | TC-002-007-003 | ✓ |

---

## Core Test Flow

### TC-002-007-001: Type `@` with name fragment — autocomplete shows matches and selection inserts mention

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-002-003-001 or TC-002-005-001

**Preconditions:**
- User has the post or reply composer open
- Test group has members with known display names
- Network connectivity active

**Steps:**
1. Tap into the body field of the New Post modal or the reply input bar
2. Type `@` followed by at least one character matching a group member's display name
3. Observe the autocomplete dropdown
4. Tap a member from the dropdown list

**Expected Result:**
An autocomplete dropdown appears showing matching group members by display name. After tapping a member, their mention is inserted into the composer text at the cursor position. The dropdown dismisses.

**Failure Indicators

