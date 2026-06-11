---
id: TC-ROA-003-003-1
title: Edit Hobbies — Test Plan
category: e-003-profile-identity
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-003
  - e-003
created: '2026-05-26'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-003-003
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-003-profile-identity/T-003-003-edit-hobbies.md
  source_checksum: ec89a5fefb50f5a3
---
## Steps
# Test Plan: Edit Hobbies

**ID:** T-003-003
**Story:** S-003-003
**Epic:** E-003
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the Edit Hobbies modal: pre-existing hobby selections are pre-selected when the modal opens, saving a new selection updates the Profile screen, deselecting all hobbies results in an empty hobbies section, and a network error during save preserves the user's in-modal selections.

## Prerequisites

- Test user with at least 2 hobbies already saved in Verint staging
- Verint user profile API accessible in staging
- Hobby list is populated (system-defined list available)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (open Edit Hobbies → current hobbies pre-selected) | TC-003-003-001 (P0) | ✓ |
| AC-002 (select 3 hobbies and save → 3 shown on Profile) | TC-003-003-001 (P0) | ✓ |
| AC-003 (deselect all + save → empty hobbies section on Profile) | TC-003-003-002 | ✓ |
| AC-004 (save fails → error shown, previous selections preserved in modal) | TC-003-003-003 | ✓ |

---

## Core Test Flow

### TC-003-003-001: Open Edit Hobbies — current hobbies pre-selected; select 3 and save → shown on Profile

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-003-001-001

**Preconditions:**
- Test user has 2 hobbies already saved in Verint
- Edit Hobbies modal is opened from the Profile screen

**Steps:**
1. Navigate to the Profile screen
2. Open the Edit Hobbies modal
3. Verify that the 2 previously saved hobbies are pre-selected (highlighted/checked)
4. Select 1 additional hobby (total 3 selected)
5. Tap Save

**Expected Result:**
On modal open, the 2 existing hobbies are pre-selected. After saving with 3 hobbies selected, the Profile screen displays all 3 hobbies. No more, no fewer.

**Failure Indicators:**
Pre-existing hobbies are not pre-selected when modal opens; Profile shows wrong number of hobbies afte

## Expected Result
# Test Plan: Edit Hobbies

**ID:** T-003-003
**Story:** S-003-003
**Epic:** E-003
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the Edit Hobbies modal: pre-existing hobby selections are pre-selected when the modal opens, saving a new selection updates the Profile screen, deselecting all hobbies results in an empty hobbies section, and a network error during save preserves the user's in-modal selections.

## Prerequisites

- Test user with at least 2 hobbies already saved in Verint staging
- Verint user profile API accessible in staging
- Hobby list is populated (system-defined list available)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (open Edit Hobbies → current hobbies pre-selected) | TC-003-003-001 (P0) | ✓ |
| AC-002 (select 3 hobbies and save → 3 shown on Profile) | TC-003-003-001 (P0) | ✓ |
| AC-003 (deselect all + save → empty hobbies section on Profile) | TC-003-003-002 | ✓ |
| AC-004 (save fails → error shown, previous selections preserved in modal) | TC-003-003-003 | ✓ |

---

## Core Test Flow

### TC-003-003-001: Open Edit Hobbies — current hobbies pre-selected; select 3 and save → shown on Profile

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-003-001-001

**Preconditions:**
- Test user has 2 hobbies already saved in Verint
- Edit Hobbies modal is opened from the Profile screen

**Steps:**
1. Navigate to the Profile screen
2. Open the Edit Hobbies modal
3. Verify that the 2 previously saved hobbies are pre-selected (highlighted/checked)
4. Select 1 additional hobby (total 3 selected)
5. Tap Save

**Expected Result:**
On modal open, the 2 existing hobbies are pre-selected. After saving with 3 hobbies selected, the Profile screen displays all 3 hobbies. No more, no fewer.

**Failure Indicators:**
Pre-existing hobbies are not pre-selected when modal opens; Profile shows wrong number of hobbies afte

