---
id: TC-CH--007-008-1
title: Account Navigation — Test Plan
category: e-007-payments-account-management
scenario: Edge Case
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-007-008
  - e-007
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-007-008
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-007-payments-account-management/T-007-008-account-navigation.md
  source_checksum: fa5cb73d0cb087ed
---
## Steps
# Test Plan: Account Navigation

**ID:** T-007-008
**Project:** ch-mobile
**Story:** S-007-008
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Account screen sub-navigation: members see "Member since {join year}" with Club Benefits and Payment Methods links; potential members see only "Account Details" with Payment Methods; both see Profile Settings, Member Support, Terms & Conditions, and Privacy Policy in Additional Info; entire row tap target works (icon, text, arrow); Member Support, Terms & Conditions, and Privacy Policy open the in-app browser; Points "View History", Available Bottles, and Rewards each navigate to their target screens.

## Prerequisites

- Test member account with a known join year (e.g., 2021)
- Test potential member account
- Stories S-004-001, S-005-001, S-006-001, S-006-002, S-007-001, S-007-004 must be Done so the navigation targets exist
- Network connectivity for in-app browser URLs

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (member: "Member since YYYY" + Club Benefits + Payment Methods) | TC-007-008-001 (P0) | ✓ |
| AC-002 (potential member: only Payment Methods under Account Details) | TC-007-008-001 (P0), TC-007-008-002 | ✓ |
| AC-003 (any tap target — icon, text, arrow — navigates) | TC-007-008-001 (P0), TC-007-008-003 | ✓ |
| AC-004 (Member Support → contact-us in in-app browser) | TC-007-008-001 (P0) | ✓ |
| AC-005 (Terms & Conditions / Privacy Policy → in-app browser) | TC-007-008-001 (P0) | ✓ |
| AC-006 (Points "View History" → Points History) | TC-007-008-001 (P0) | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-008-001: Member and potential member traverse every Account navigation row and verify all destinations

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005, AC-006
**Dep

## Expected Result
# Test Plan: Account Navigation

**ID:** T-007-008
**Project:** ch-mobile
**Story:** S-007-008
**Epic:** E-007
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the Account screen sub-navigation: members see "Member since {join year}" with Club Benefits and Payment Methods links; potential members see only "Account Details" with Payment Methods; both see Profile Settings, Member Support, Terms & Conditions, and Privacy Policy in Additional Info; entire row tap target works (icon, text, arrow); Member Support, Terms & Conditions, and Privacy Policy open the in-app browser; Points "View History", Available Bottles, and Rewards each navigate to their target screens.

## Prerequisites

- Test member account with a known join year (e.g., 2021)
- Test potential member account
- Stories S-004-001, S-005-001, S-006-001, S-006-002, S-007-001, S-007-004 must be Done so the navigation targets exist
- Network connectivity for in-app browser URLs

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (member: "Member since YYYY" + Club Benefits + Payment Methods) | TC-007-008-001 (P0) | ✓ |
| AC-002 (potential member: only Payment Methods under Account Details) | TC-007-008-001 (P0), TC-007-008-002 | ✓ |
| AC-003 (any tap target — icon, text, arrow — navigates) | TC-007-008-001 (P0), TC-007-008-003 | ✓ |
| AC-004 (Member Support → contact-us in in-app browser) | TC-007-008-001 (P0) | ✓ |
| AC-005 (Terms & Conditions / Privacy Policy → in-app browser) | TC-007-008-001 (P0) | ✓ |
| AC-006 (Points "View History" → Points History) | TC-007-008-001 (P0) | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-007-008-001: Member and potential member traverse every Account navigation row and verify all destinations

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002, AC-003, AC-004, AC-005, AC-006
**Dep

