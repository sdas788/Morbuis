---
id: TC-ROA-002-005-1
title: Comments & Replies — Test Plan
category: e-002-group-community
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-005
  - e-002
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-002-005
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-002-group-community/T-002-005-comments-replies.md
  source_checksum: d54a5b9646c68e11
---
## Steps
# Test Plan: Comments & Replies

**ID:** T-002-005
**Story:** S-002-005
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies reply creation and management within a forum thread: submitting a reply adds it to the thread immediately, the context menu on the user's own reply shows Edit and Delete options, editing pre-populates a modal and saves the updated text, and deleting requires confirmation before removing the reply.

## Prerequisites

- Test user is a member of a group with at least one thread containing replies
- Test user has at least one reply in the thread
- Second test user's reply is also present in the thread

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (type reply + send → reply appears immediately) | TC-002-005-001 (P0) | ✓ |
| AC-002 (long-press own reply → Edit/Delete shown) | TC-002-005-002 | ✓ |
| AC-003 (edit reply and save → updated text shown) | TC-002-005-003 | ✓ |
| AC-004 (delete reply + confirm → reply removed) | TC-002-005-004 | ✓ |

---

## Core Test Flow

### TC-002-005-001: Type a reply and send — reply appears in the thread immediately

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-002-002-001

**Preconditions:**
- User is on the post detail view
- Comment input bar is visible at the bottom
- Network connectivity active

**Steps:**
1. Tap the comment input bar at the bottom of the post detail view
2. Type reply text
3. Tap the send button

**Expected Result:**
The reply appears in the thread immediately without a page reload. The input bar clears after sending.

**Failure Indicators:**
Reply does not appear after sending; page reload required to see the reply; input bar does not clear; send button is unresponsive.

---

## Sub Flows

### TC-002-005-002: Long-press own reply shows Edit and Delete context menu options

**Type:** E2E
**Priority:** P1
**AC Covered:** AC-002
**Dependen

## Expected Result
# Test Plan: Comments & Replies

**ID:** T-002-005
**Story:** S-002-005
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies reply creation and management within a forum thread: submitting a reply adds it to the thread immediately, the context menu on the user's own reply shows Edit and Delete options, editing pre-populates a modal and saves the updated text, and deleting requires confirmation before removing the reply.

## Prerequisites

- Test user is a member of a group with at least one thread containing replies
- Test user has at least one reply in the thread
- Second test user's reply is also present in the thread

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (type reply + send → reply appears immediately) | TC-002-005-001 (P0) | ✓ |
| AC-002 (long-press own reply → Edit/Delete shown) | TC-002-005-002 | ✓ |
| AC-003 (edit reply and save → updated text shown) | TC-002-005-003 | ✓ |
| AC-004 (delete reply + confirm → reply removed) | TC-002-005-004 | ✓ |

---

## Core Test Flow

### TC-002-005-001: Type a reply and send — reply appears in the thread immediately

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** TC-002-002-001

**Preconditions:**
- User is on the post detail view
- Comment input bar is visible at the bottom
- Network connectivity active

**Steps:**
1. Tap the comment input bar at the bottom of the post detail view
2. Type reply text
3. Tap the send button

**Expected Result:**
The reply appears in the thread immediately without a page reload. The input bar clears after sending.

**Failure Indicators:**
Reply does not appear after sending; page reload required to see the reply; input bar does not clear; send button is unresponsive.

---

## Sub Flows

### TC-002-005-002: Long-press own reply shows Edit and Delete context menu options

**Type:** E2E
**Priority:** P1
**AC Covered:** AC-002
**Dependen

