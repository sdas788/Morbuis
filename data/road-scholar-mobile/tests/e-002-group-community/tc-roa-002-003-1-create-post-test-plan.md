---
id: TC-ROA-002-003-1
title: Create Post — Test Plan
category: e-002-group-community
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-002-003
  - e-002
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-002-003
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-002-group-community/T-002-003-create-post.md
  source_checksum: e27956b5eac84f6f
---
## Steps
# Test Plan: Create Post

**ID:** T-002-003
**Story:** S-002-003
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies post creation in the group forum: a text post with a photo creates a thread visible at the top of the forum, the offline state blocks submission with an error and retry option, media uploads use chunked upload before thread creation, and missing subject triggers a validation error.

## Prerequisites

- Authenticated test user who is a member of a test group
- Group forum loaded (S-002-002 flow complete)
- Test image available in device photo library
- Staging Verint and media endpoint accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (valid text + photo → thread created, visible in forum) | TC-002-003-001 (P0) | ✓ |
| AC-002 (offline → error shown with retry option) | TC-002-003-002 | ✓ |
| AC-003 (photo attached → chunked upload before thread creation) | TC-002-003-001 (P0) | ✓ |
| AC-004 (no subject → validation error) | TC-002-003-003 | ✓ |

---

## Core Test Flow

### TC-002-003-001: Valid text and photo — thread created and immediately visible at top of forum

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-003
**Dependencies:** TC-002-002-001

**Preconditions:**
- User is in the group forum
- Network connectivity active
- Photo available in device library

**Steps:**
1. Open the New Post modal
2. Enter a subject line
3. Enter body text
4. Attach a photo from the device library
5. Tap "Post"
6. Observe the forum after modal closes

**Expected Result:**
The New Post modal closes. The new thread appears at the top of the forum list. The attached photo was uploaded via chunked upload (1 MB chunks) to the Verint temporary media endpoint before the thread creation API call. The thread shows the correct subject and body.

**Failure Indicators:**
Modal stays open after posting; new thread does not appear at 

## Expected Result
# Test Plan: Create Post

**ID:** T-002-003
**Story:** S-002-003
**Epic:** E-002
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies post creation in the group forum: a text post with a photo creates a thread visible at the top of the forum, the offline state blocks submission with an error and retry option, media uploads use chunked upload before thread creation, and missing subject triggers a validation error.

## Prerequisites

- Authenticated test user who is a member of a test group
- Group forum loaded (S-002-002 flow complete)
- Test image available in device photo library
- Staging Verint and media endpoint accessible

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (valid text + photo → thread created, visible in forum) | TC-002-003-001 (P0) | ✓ |
| AC-002 (offline → error shown with retry option) | TC-002-003-002 | ✓ |
| AC-003 (photo attached → chunked upload before thread creation) | TC-002-003-001 (P0) | ✓ |
| AC-004 (no subject → validation error) | TC-002-003-003 | ✓ |

---

## Core Test Flow

### TC-002-003-001: Valid text and photo — thread created and immediately visible at top of forum

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-003
**Dependencies:** TC-002-002-001

**Preconditions:**
- User is in the group forum
- Network connectivity active
- Photo available in device library

**Steps:**
1. Open the New Post modal
2. Enter a subject line
3. Enter body text
4. Attach a photo from the device library
5. Tap "Post"
6. Observe the forum after modal closes

**Expected Result:**
The New Post modal closes. The new thread appears at the top of the forum list. The attached photo was uploaded via chunked upload (1 MB chunks) to the Verint temporary media endpoint before the thread creation API call. The thread shows the correct subject and body.

**Failure Indicators:**
Modal stays open after posting; new thread does not appear at 

