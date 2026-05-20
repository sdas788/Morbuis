---
id: TC-CH--007-004-1
title: Edit Profile & Contact Info — Test Plan
category: e-007-payments-account-management
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-007-004
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-004
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-004-edit-profile-contact-info.md
  source_checksum: b0a4b2ef3da4cb58
---
## Steps
# Test Plan: Edit Profile & Contact Info

**ID:** T-007-004
**Project:** ch-mobile
**Story:** S-007-004
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Profile Settings screen renders all expected fields (First/Last Name, Email, Phone, Birthdate), supports the "empty" birthdate display + MM/DD/YYYY placeholder for potential members, gates the Save Changes button on edit-detection, supports password change with confirmation + eyeball toggles + cross-platform Cognito sync, supports adding and removing a secondary member, validates inputs, and handles save success and failure correctly via `PUT /customer`.

## Prerequisites

- Test full member with all fields populated and a known password
- Test potential member with no birthdate set and no secondary member
- Stagable `PUT /customer` and `GET /static/territories` endpoints
- Access to the carryout.chwinery.com and member.chwinery.com login pages (for cross-platform password verification)
- App authenticated for each role under test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (fields displayed) | TC-007-004-001 (P0) | ✓ |
| AC-002 (potential member birthdate "empty" + placeholder) | TC-007-004-001 (P0), TC-007-004-002 | ✓ |
| AC-003 (Save Changes greyed when no edits) | TC-007-004-001 (P0) | ✓ |
| AC-004 (Save Changes activates on edit) | TC-007-004-001 (P0) | ✓ |
| AC-005 (password fields with eyeball toggles) | TC-007-004-001 (P0), TC-007-004-003 | ✓ |
| AC-006 (new password works on carryout / member sites) | TC-007-004-001 (P0), TC-007-004-004 | ✓ |
| AC-007 (no secondary → "Add a secondary member" link) | TC-007-004-001 (P0) | ✓ |
| AC-008 (add secondary member persists) | TC-007-004-001 (P0), TC-007-004-005 | ✓ |
| AC-009 (remove secondary member) | TC-007-004-001 (P0), TC-007-004-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing be

## Expected Result
# Test Plan: Edit Profile & Contact Info

**ID:** T-007-004
**Project:** ch-mobile
**Story:** S-007-004
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Profile Settings screen renders all expected fields (First/Last Name, Email, Phone, Birthdate), supports the "empty" birthdate display + MM/DD/YYYY placeholder for potential members, gates the Save Changes button on edit-detection, supports password change with confirmation + eyeball toggles + cross-platform Cognito sync, supports adding and removing a secondary member, validates inputs, and handles save success and failure correctly via `PUT /customer`.

## Prerequisites

- Test full member with all fields populated and a known password
- Test potential member with no birthdate set and no secondary member
- Stagable `PUT /customer` and `GET /static/territories` endpoints
- Access to the carryout.chwinery.com and member.chwinery.com login pages (for cross-platform password verification)
- App authenticated for each role under test

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (fields displayed) | TC-007-004-001 (P0) | ✓ |
| AC-002 (potential member birthdate "empty" + placeholder) | TC-007-004-001 (P0), TC-007-004-002 | ✓ |
| AC-003 (Save Changes greyed when no edits) | TC-007-004-001 (P0) | ✓ |
| AC-004 (Save Changes activates on edit) | TC-007-004-001 (P0) | ✓ |
| AC-005 (password fields with eyeball toggles) | TC-007-004-001 (P0), TC-007-004-003 | ✓ |
| AC-006 (new password works on carryout / member sites) | TC-007-004-001 (P0), TC-007-004-004 | ✓ |
| AC-007 (no secondary → "Add a secondary member" link) | TC-007-004-001 (P0) | ✓ |
| AC-008 (add secondary member persists) | TC-007-004-001 (P0), TC-007-004-005 | ✓ |
| AC-009 (remove secondary member) | TC-007-004-001 (P0), TC-007-004-006 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing be

