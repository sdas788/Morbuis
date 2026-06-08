---
id: TC-ROA-002-004-1
title: Edit & Delete Post — Test Plan
category: e-002-group-community
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-002-004
  - e-002
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-002-004
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-002-group-community/T-002-004-edit-delete-post.md
  source_checksum: e5d2c861c1953c94
---
## Steps
# Test Plan: Edit & Delete Post

**ID:** T-002-004
**Story:** S-002-004
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies that a user can edit and delete their own posts: the edit modal opens pre-populated with current content and saves correctly, delete requires a confirmation prompt before removing the post, and another user's post does not show edit or delete options.

## Prerequisites

- Test user with at least one authored post in a group forum
- Second test user (different account) with a post in the same group
- Both accounts accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (own post → Edit tap → modal pre-populated) | TC-002-004-001 (P0) | ✓ |
| AC-002 (edit and save → updated content visible in forum) | TC-002-004-001 (P0) | ✓ |
| AC-003 (delete with confirmation → post removed) | TC-002-004-002 | ✓ |
| AC-004 (another member's post → Edit/Delete not shown) | TC-002-004-003 | ✓ |

---

## Core Test Flow

### TC-002-004-001: Own post — Edit opens pre-populated modal and saves updated content to forum

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-002-003-001

**Preconditions:**
- Test user has an authored post in the group forum
- User is viewing the group forum or the post detail

**Steps:**
1. Open the context menu on the user's own post
2. Tap "Edit"
3. Observe the Edit Post modal
4. Modify the subject or body text
5. Tap Save

**Expected Result:**
The Edit Post modal opens pre-populated with the current subject, body, and attachments. After saving, the modal closes and the updated content is immediately visible in the forum thread.

**Failure Indicators:**
Modal opens empty or partially populated; changes are not reflected in the forum after saving; save button is unresponsive; modal stays open after saving.

---

## Sub Flows

### TC-002-004-002: Delete own post — con

## Expected Result
# Test Plan: Edit & Delete Post

**ID:** T-002-004
**Story:** S-002-004
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies that a user can edit and delete their own posts: the edit modal opens pre-populated with current content and saves correctly, delete requires a confirmation prompt before removing the post, and another user's post does not show edit or delete options.

## Prerequisites

- Test user with at least one authored post in a group forum
- Second test user (different account) with a post in the same group
- Both accounts accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (own post → Edit tap → modal pre-populated) | TC-002-004-001 (P0) | ✓ |
| AC-002 (edit and save → updated content visible in forum) | TC-002-004-001 (P0) | ✓ |
| AC-003 (delete with confirmation → post removed) | TC-002-004-002 | ✓ |
| AC-004 (another member's post → Edit/Delete not shown) | TC-002-004-003 | ✓ |

---

## Core Test Flow

### TC-002-004-001: Own post — Edit opens pre-populated modal and saves updated content to forum

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-002-003-001

**Preconditions:**
- Test user has an authored post in the group forum
- User is viewing the group forum or the post detail

**Steps:**
1. Open the context menu on the user's own post
2. Tap "Edit"
3. Observe the Edit Post modal
4. Modify the subject or body text
5. Tap Save

**Expected Result:**
The Edit Post modal opens pre-populated with the current subject, body, and attachments. After saving, the modal closes and the updated content is immediately visible in the forum thread.

**Failure Indicators:**
Modal opens empty or partially populated; changes are not reflected in the forum after saving; save button is unresponsive; modal stays open after saving.

---

## Sub Flows

### TC-002-004-002: Delete own post — con

