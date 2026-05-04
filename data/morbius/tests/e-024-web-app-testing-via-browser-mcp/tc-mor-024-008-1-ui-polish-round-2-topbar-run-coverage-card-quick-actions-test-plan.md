---
id: TC-MOR-024-008-1
title: UI Polish Round 2 — Topbar Run + Coverage Card + Quick Actions — Test Plan
category: e-024-web-app-testing-via-browser-mcp
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-024-008
  - e-024
created: '2026-04-29'
updated: '2026-04-30'
pmagent_source:
  slug: morbius
  story_id: S-024-008
  ac_index: 0
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-024-web-app-testing/T-024-008-s-024-008-test-plan.md
  source_checksum: c38f79777352e12b
---
## Steps
# Test Plan: Given the active project's projectType is web When I look at the topba

**ID:** T-024-008
**Project:** morbius
**Story:** S-024-008
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-008`._

---

## Scope

Verification of S-024-008 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-008-001 (P0) | ✓ |
| AC-002 | TC-024-008-002 | ✓ |
| AC-003 | TC-024-008-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-008-001: Given the active project's projectType is web When I look at the topba

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-008-1 (sourceChecksum=13afc6bf279464df) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the active project's `projectType` is `web`
2. I look at the topbar
3. the action button reads "Run tests" (not "Run suite") and clicking it navigates to Test Cases (not the Maestro view); for `mobile` projects the existing "Run suite" → Maestro behavior is preserved

**Expected Result:**
Given the active project's `projectType` is `web` When I look at the topbar Then the action button reads "Run tests" (not "Run suite") and clicking it navigates to Test Cases (not the Maestro view); for `mobile` projects the existing "Run suite" → Maestro behavior is preserved

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios, edge cases, and regression guard

## Expected Result
# Test Plan: Given the active project's projectType is web When I look at the topba

**ID:** T-024-008
**Project:** morbius
**Story:** S-024-008
**Epic:** E-024
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

> _Generated from Morbius test cases (E-023 publish-back). 3 test case(s) sourced from `morbius:S-024-008`._

---

## Scope

Verification of S-024-008 acceptance criteria. 3 test case(s) span the happy path plus negative and edge variations.

## Prerequisites

- (Inherit from story Prerequisites; fill in environment + data setup before authoring)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 | TC-024-008-001 (P0) | ✓ |
| AC-002 | TC-024-008-002 | ✓ |
| AC-003 | TC-024-008-003 | ✓ |

---

## Core Test Flow

> P0 — exactly one test case per plan. Must pass before Sub Flow testing begins. Stop if P0 fails.

### TC-024-008-001: Given the active project's projectType is web When I look at the topba

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001
**Dependencies:** None

<!-- Morbius source: TC-MOR-024-008-1 (sourceChecksum=13afc6bf279464df) -->

**Preconditions:**
- (derived from story prerequisites — fill in or leave empty)

**Steps:**
1. the active project's `projectType` is `web`
2. I look at the topbar
3. the action button reads "Run tests" (not "Run suite") and clicking it navigates to Test Cases (not the Maestro view); for `mobile` projects the existing "Run suite" → Maestro behavior is preserved

**Expected Result:**
Given the active project's `projectType` is `web` When I look at the topbar Then the action button reads "Run tests" (not "Run suite") and clicking it navigates to Test Cases (not the Maestro view); for `mobile` projects the existing "Run suite" → Maestro behavior is preserved

**Failure Indicators:**
- (describe the wrong behavior; populate during real test authoring)

---

## Sub Flows

> All test cases beyond the core flow. Negative scenarios, edge cases, and regression guard

