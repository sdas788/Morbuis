---
id: TC-CH--004-005-1
title: Multi-Membership Management — Test Plan
category: e-004-wine-club-membership
scenario: Edge Case
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-004-005
  - e-004
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-004-005
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-004-wine-club-membership/T-004-005-multi-membership-management.md
  source_checksum: de20876a0769d015
---
## Steps
# Test Plan: Multi-Membership Management

**ID:** T-004-005
**Project:** ch-mobile
**Story:** S-004-005
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that members holding multiple Wine Club memberships see a dropdown selector in the Member Type/ID/Membership area of Account, can switch the active membership by tapping anywhere on the dropdown (text or arrow), see the chosen membership reflected across the entire app (wallet, benefits, billing, bottle counts), see no dropdown when only one membership exists, retain the last-selected membership across app launches, and see both active and lapsed memberships listed in the dropdown.

## Prerequisites

- Staging environment with seeded test users:
  - Multi-A: two Active memberships at different locations
  - Multi-B: one Active and one Lapsed (Inactive or Cancel) membership
  - Single-A: exactly one Active membership
- Each membership has distinct identifiers, distinct bottle counts, and distinct wine wallet contents so context switches are observable
- App build that renders the Member Type/ID dropdown component

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (multi-membership shows as dropdown) | TC-004-005-001 (P0) | ✓ |
| AC-002 (tap on text or arrow opens selection) | TC-004-005-001 (P0), TC-004-005-002 | ✓ |
| AC-003 (selection closes dropdown and updates account info) | TC-004-005-001 (P0) | ✓ |
| AC-004 (full app reflects new membership across screens) | TC-004-005-001 (P0) | ✓ |
| AC-005 (single-membership shows static text, no dropdown) | TC-004-005-003 | ✓ |
| AC-006 (last-selected membership persists across launches) | TC-004-005-004 | ✓ |
| AC-007 (active + lapsed both appear with statuses) | TC-004-005-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-004-005-001: Multi-membership us

## Expected Result
# Test Plan: Multi-Membership Management

**ID:** T-004-005
**Project:** ch-mobile
**Story:** S-004-005
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies that members holding multiple Wine Club memberships see a dropdown selector in the Member Type/ID/Membership area of Account, can switch the active membership by tapping anywhere on the dropdown (text or arrow), see the chosen membership reflected across the entire app (wallet, benefits, billing, bottle counts), see no dropdown when only one membership exists, retain the last-selected membership across app launches, and see both active and lapsed memberships listed in the dropdown.

## Prerequisites

- Staging environment with seeded test users:
  - Multi-A: two Active memberships at different locations
  - Multi-B: one Active and one Lapsed (Inactive or Cancel) membership
  - Single-A: exactly one Active membership
- Each membership has distinct identifiers, distinct bottle counts, and distinct wine wallet contents so context switches are observable
- App build that renders the Member Type/ID dropdown component

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (multi-membership shows as dropdown) | TC-004-005-001 (P0) | ✓ |
| AC-002 (tap on text or arrow opens selection) | TC-004-005-001 (P0), TC-004-005-002 | ✓ |
| AC-003 (selection closes dropdown and updates account info) | TC-004-005-001 (P0) | ✓ |
| AC-004 (full app reflects new membership across screens) | TC-004-005-001 (P0) | ✓ |
| AC-005 (single-membership shows static text, no dropdown) | TC-004-005-003 | ✓ |
| AC-006 (last-selected membership persists across launches) | TC-004-005-004 | ✓ |
| AC-007 (active + lapsed both appear with statuses) | TC-004-005-005 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-004-005-001: Multi-membership us

