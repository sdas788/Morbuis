---
id: TC-ROA-003-004-1
title: Privacy Settings — Test Plan
category: e-003-profile-identity
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-003-004
  - e-003
created: '2026-05-26'
updated: '2026-05-26'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-003-004
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-003-profile-identity/T-003-004-privacy-settings.md
  source_checksum: f426e507d19e2e89
---
## Steps
# Test Plan: Privacy Settings

**ID:** T-003-004
**Story:** S-003-004
**Epic:** E-003
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the privacy settings toggles: disabling a field hides it from other users' profile views, enabling a previously hidden field makes it visible again, toggles save immediately without a Save button, and a save failure reverts the toggle and shows an error message.

## Prerequisites

- Test user with email, phone, birthday, and hometown populated in their Verint profile
- A second test account to verify other-user visibility behavior
- Verint user profile API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (disable "Show Email" → email hidden from other user's view) | TC-003-004-001 (P0) | ✓ |
| AC-002 (enable previously hidden field → field visible to other user) | TC-003-004-002 | ✓ |
| AC-003 (toggle changed → saved immediately, no Save tap required) | TC-003-004-001 (P0) | ✓ |
| AC-004 (save fails → toggle reverts + error message shown) | TC-003-004-003 | ✓ |

---

## Core Test Flow

### TC-003-004-001: Disable "Show Email" — email field hidden when another user views the profile; change saves immediately

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-003
**Dependencies:** TC-003-001-001

**Preconditions:**
- Test user has email populated in Verint
- "Show Email" toggle is currently enabled
- Second test account available to check the other-user profile view

**Steps:**
1. Navigate to Privacy Settings
2. Toggle "Show Email" to disabled (off)
3. Observe that no Save button is required — change should persist immediately
4. Switch to the second test account
5. View the first user's profile as the second user

**Expected Result:**
The email field is not visible on the profile when viewed by the second user. The toggle change was persisted to Verint immediately on toggle (no Save tap). The

## Expected Result
# Test Plan: Privacy Settings

**ID:** T-003-004
**Story:** S-003-004
**Epic:** E-003
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the privacy settings toggles: disabling a field hides it from other users' profile views, enabling a previously hidden field makes it visible again, toggles save immediately without a Save button, and a save failure reverts the toggle and shows an error message.

## Prerequisites

- Test user with email, phone, birthday, and hometown populated in their Verint profile
- A second test account to verify other-user visibility behavior
- Verint user profile API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (disable "Show Email" → email hidden from other user's view) | TC-003-004-001 (P0) | ✓ |
| AC-002 (enable previously hidden field → field visible to other user) | TC-003-004-002 | ✓ |
| AC-003 (toggle changed → saved immediately, no Save tap required) | TC-003-004-001 (P0) | ✓ |
| AC-004 (save fails → toggle reverts + error message shown) | TC-003-004-003 | ✓ |

---

## Core Test Flow

### TC-003-004-001: Disable "Show Email" — email field hidden when another user views the profile; change saves immediately

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-003
**Dependencies:** TC-003-001-001

**Preconditions:**
- Test user has email populated in Verint
- "Show Email" toggle is currently enabled
- Second test account available to check the other-user profile view

**Steps:**
1. Navigate to Privacy Settings
2. Toggle "Show Email" to disabled (off)
3. Observe that no Save button is required — change should persist immediately
4. Switch to the second test account
5. View the first user's profile as the second user

**Expected Result:**
The email field is not visible on the profile when viewed by the second user. The toggle change was persisted to Verint immediately on toggle (no Save tap). The

